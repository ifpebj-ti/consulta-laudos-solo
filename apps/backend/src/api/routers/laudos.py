import os
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse

from src.api.deps import authorize_laudo_access, pdf_download_semaphore
from src.core.config import settings
from src.core.limiter import limiter

router = APIRouter(prefix="/laudos", tags=["Laudos"])

# Regex para validação estrita do formato de protocolo (apenas alfanuméricos, ponto e hífen)
PROTOCOLO_REGEX = re.compile(r"^[A-Z0-9.-]{4,30}$")


@router.get("/{protocolo}/pdf")
@limiter.limit("10/minute")
async def baixar_pdf_laudo(
    request: Request,
    protocolo: str,
    user: dict = Depends(authorize_laudo_access),
):
    """
    Download do arquivo PDF do laudo.
    Proteções aplicadas (SEC-001):
    - RBAC / BOLA: Cliente só pode baixar o PDF do seu próprio protocolo.
    - Path Traversal (CodeQL py/path-injection): Validação por regex estrita,
      extração com os.path.basename e contenção canônica com os.path.realpath/startswith.
    - DoS: Semáforo assíncrono para limitar streaming concorrente a 10 processos.
    - Rate Limit: 10 downloads/minuto por IP.
    """
    clean_protocolo = protocolo.strip().upper()

    # Validação rigorosa do protocolo com regex e bloqueio explícito de sequências de diretório
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

    # Sanitização do nome de arquivo com os.path.basename para prevenir path injection
    safe_filename = os.path.basename(f"{clean_protocolo}.pdf")

    # Resolução canônica absoluta do diretório base e do arquivo alvo
    base_storage = os.path.realpath(settings.STORAGE_DIR)
    target_path = os.path.realpath(os.path.join(base_storage, safe_filename))

    # VULN-05: Garantir que o caminho canônico reside estritamente sob o diretório base
    if not target_path.startswith(base_storage + os.sep) or not os.path.isfile(
        target_path
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "sucesso": False,
                "mensagem": "Arquivo PDF do laudo não encontrado.",
            },
        )

    # VULN-06: Concorrência controlada
    async with pdf_download_semaphore:
        return FileResponse(
            path=target_path,
            media_type="application/pdf",
            filename=f"laudo-{clean_protocolo}.pdf",
        )
