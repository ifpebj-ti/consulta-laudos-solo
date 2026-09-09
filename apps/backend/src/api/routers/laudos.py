from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse

from src.api.deps import authorize_laudo_access, pdf_download_semaphore
from src.core.config import settings
from src.core.limiter import limiter

router = APIRouter(prefix="/laudos", tags=["Laudos"])


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
    - Path Traversal: Checagem canônica via Path.resolve().is_relative_to().
    - DoS: Semáforo assíncrono para limitar streaming concorrente a 10 processos.
    - Rate Limit: 10 downloads/minuto por IP.
    """
    # Sanitização básica do parâmetro
    clean_protocolo = protocolo.strip().upper()
    if "/" in clean_protocolo or "\\" in clean_protocolo or ".." in clean_protocolo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"sucesso": False, "mensagem": "Protocolo com caracteres inválidos."},
        )

    base_storage = Path(settings.STORAGE_DIR).resolve()
    target_path = (base_storage / f"{clean_protocolo}.pdf").resolve()

    # VULN-05: Garantir que o caminho resolvido permanece estritamente dentro da pasta de storage
    try:
        is_safe = target_path.is_relative_to(base_storage)
    except AttributeError:
        # Fallback para Python < 3.9
        is_safe = str(target_path).startswith(str(base_storage))

    if not is_safe or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"sucesso": False, "mensagem": "Arquivo PDF do laudo não encontrado."},
        )

    # VULN-06: Concorrência controlada
    async with pdf_download_semaphore:
        return FileResponse(
            path=target_path,
            media_type="application/pdf",
            filename=f"laudo-{clean_protocolo}.pdf",
        )
