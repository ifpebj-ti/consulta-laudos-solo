import os
import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.deps import authorize_laudo_access, pdf_download_semaphore
from src.core.config import settings
from src.core.database import get_db
from src.core.limiter import limiter
from src.models.laudo import Laudo
from src.schemas.laudo import SituacaoLaudoResponse
from src.services.laudo_service import LaudoAuthService
from src.services.pdf_service import PdfService

router = APIRouter(prefix="/laudos", tags=["Laudos"])

# Regex para validação estrita do formato de protocolo (apenas alfanuméricos, ponto e hífen)
PROTOCOLO_REGEX = re.compile(r"^[A-Z0-9.-]{4,30}$")


def _validar_formato_protocolo(protocolo: str) -> str:
    clean_protocolo = protocolo.strip().upper()
    if (
        not PROTOCOLO_REGEX.fullmatch(clean_protocolo)
        or ".." in clean_protocolo
        or "/" in clean_protocolo
        or "\\" in clean_protocolo
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "sucesso": False,
                "mensagem": "Protocolo com caracteres inválidos.",
            },
        )
    return clean_protocolo


@router.get("/{protocolo}", response_model=SituacaoLaudoResponse)
@limiter.limit("30/minute")
async def consultar_situacao_laudo(
    request: Request,
    protocolo: str,
    user: dict = Depends(authorize_laudo_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna a situação atualizada do laudo para acompanhamento pelo cliente ou analista.
    """
    clean_protocolo = _validar_formato_protocolo(protocolo)
    detalhe = await LaudoAuthService.obter_situacao_laudo_db(clean_protocolo, db)
    if not detalhe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "sucesso": False,
                "mensagem": "Laudo não encontrado para o protocolo informado.",
            },
        )
    return SituacaoLaudoResponse(sucesso=True, laudo=detalhe)


@router.get("/{protocolo}/pdf")
@limiter.limit("10/minute")
async def baixar_pdf_laudo(
    request: Request,
    protocolo: str,
    user: dict = Depends(authorize_laudo_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Geração sob demanda e download do arquivo PDF oficial do laudo.
    Proteções aplicadas (SEC-001):
    - RBAC / BOLA: Cliente só pode baixar o PDF do seu próprio protocolo.
    - Path Traversal (CodeQL py/path-injection): Validação por regex estrita,
      extração com os.path.basename e contenção canônica com os.path.realpath/startswith.
    - DoS: Semáforo assíncrono para limitar geração/streaming concorrente a 10 processos.
    - Rate Limit: 10 downloads/minuto por IP.
    """
    clean_protocolo = _validar_formato_protocolo(protocolo)

    # 1. Consulta o laudo no banco de dados para geração do PDF sob demanda
    stmt = (
        select(Laudo)
        .options(selectinload(Laudo.bancada), selectinload(Laudo.resultado_calculado))
        .where(func.upper(Laudo.protocolo) == clean_protocolo)
    )
    res = await db.execute(stmt)
    laudo = res.scalar_one_or_none()

    if laudo and laudo.status == "CONCLUIDO":
        async with pdf_download_semaphore:
            pdf_bytes = PdfService.gerar_pdf(
                laudo=laudo,
                bancada=laudo.bancada,
                res_calc=laudo.resultado_calculado,
            )
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="laudo-{clean_protocolo}.pdf"',
                    "Cache-Control": "private, no-store",
                },
            )

    # 2. Fallback para arquivo estático no STORAGE_DIR (compatibilidade legada / testes)
    safe_filename = os.path.basename(f"{clean_protocolo}.pdf")
    base_storage = os.path.realpath(settings.STORAGE_DIR)
    target_path = os.path.realpath(os.path.join(base_storage, safe_filename))

    if target_path.startswith(base_storage + os.sep) and os.path.isfile(target_path):
        async with pdf_download_semaphore:
            return FileResponse(
                path=target_path,
                media_type="application/pdf",
                filename=f"laudo-{clean_protocolo}.pdf",
            )

    # 3. Se o laudo existe no banco mas ainda não foi homologado, retorna 409 Conflict
    if laudo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "sucesso": False,
                "mensagem": "O PDF deste laudo ainda não está disponível (aguardando homologação).",
                "codigoErro": "PDF_NAO_GERADO",
            },
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "sucesso": False,
            "mensagem": "Arquivo PDF do laudo não encontrado.",
        },
    )
