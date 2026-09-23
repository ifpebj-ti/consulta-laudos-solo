from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import require_role
from src.core.database import get_db
from src.schemas.analise import (
    ObterAnaliseResponse,
    ProcessarAnaliseInput,
    ProcessarAnaliseResponse,
    RascunhoAnaliseInput,
    RascunhoSalvoResponse,
)
from src.services.analise_service import AnaliseService

router = APIRouter(prefix="/laudos", tags=["Análises Laboratoriais"])


@router.get(
    "/{protocolo}/analise",
    response_model=ObterAnaliseResponse,
    status_code=status.HTTP_200_OK,
    summary="Obter dados de bancada da análise laboratorial",
)
async def obter_analise(
    protocolo: str,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna os dados de bancada brutos, metadados da amostra, rascunho e curva de calibração.
    Exige perfil de acesso ANALISTA.
    """
    return await AnaliseService.obter_analise(protocolo=protocolo, db=db)


@router.patch(
    "/{protocolo}/analise/rascunho",
    response_model=RascunhoSalvoResponse,
    status_code=status.HTTP_200_OK,
    summary="Salvar rascunho incremental da análise (Auto-Save)",
)
async def salvar_rascunho(
    protocolo: str,
    payload: RascunhoAnaliseInput,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Salva incrementalmente dados parciais de bancada.
    Valida concorrência otimista com base no campo versaoEsperada.
    Exige perfil de acesso ANALISTA.
    """
    return await AnaliseService.salvar_rascunho(
        protocolo=protocolo,
        payload=payload,
        usuario=user,
        db=db,
    )


@router.post(
    "/{protocolo}/analise/processar",
    response_model=ProcessarAnaliseResponse,
    status_code=status.HTTP_200_OK,
    summary="Salvar e processar cálculos agronômicos oficiais da análise",
)
async def processar_analise(
    protocolo: str,
    payload: ProcessarAnaliseInput,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Valida a completude de bancada, reexecuta cálculos oficiais agronômicos,
    grava os resultados consolidados e avança o status para AGUARDANDO_HOMOLOGACAO.
    Exige perfil de acesso ANALISTA.
    """
    return await AnaliseService.processar_analise(
        protocolo=protocolo,
        payload=payload,
        usuario=user,
        db=db,
    )
