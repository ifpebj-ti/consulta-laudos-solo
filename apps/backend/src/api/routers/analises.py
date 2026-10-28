from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import require_role
from src.core.database import get_db
from src.schemas.analise import (
    CriarLaudoInput,
    CriarLaudoResponse,
    HomologarAnaliseResponse,
    ListarLaudosResponse,
    ObterAnaliseResponse,
    ProcessarAnaliseInput,
    ProcessarAnaliseResponse,
    RascunhoAnaliseInput,
    RascunhoSalvoResponse,
)
from src.services.analise_service import AnaliseService

router = APIRouter(prefix="/laudos", tags=["Análises Laboratoriais"])


@router.get(
    "",
    response_model=ListarLaudosResponse,
    status_code=status.HTTP_200_OK,
    summary="Listar laudos/amostras cadastrados (dashboard do analista)",
)
async def listar_laudos(
    pagina: int = Query(1, ge=1, description="Número da página"),
    por_pagina: int = Query(20, ge=1, le=100, description="Itens por página"),
    status_filtro: str | None = Query(None, alias="status", description="Filtrar por status"),
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista todos os laudos com paginação e filtro opcional por status.
    Exige perfil de acesso ANALISTA.
    """
    return await AnaliseService.listar_laudos(
        pagina=pagina, por_pagina=por_pagina, status_filtro=status_filtro, db=db
    )


@router.post(
    "",
    response_model=CriarLaudoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar nova amostra / laudo para análise laboratorial",
)
async def criar_laudo(
    payload: CriarLaudoInput,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Cadastra uma nova amostra/laudo e inicializa uma bancada limpa associada.
    Exige perfil de acesso ANALISTA.
    """
    return await AnaliseService.criar_laudo(payload=payload, usuario=user, db=db)


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


@router.post(
    "/{protocolo}/analise/homologar",
    response_model=HomologarAnaliseResponse,
    status_code=status.HTTP_200_OK,
    summary="Homologar análise laboratorial — avança status para CONCLUIDO",
)
async def homologar_analise(
    protocolo: str,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Homologa a análise laboratorial, avançando o status de AGUARDANDO_HOMOLOGACAO
    para CONCLUIDO e registrando o responsável pela homologação.
    Exige perfil de acesso ANALISTA.
    """
    return await AnaliseService.homologar_analise(
        protocolo=protocolo,
        usuario=user,
        db=db,
    )
