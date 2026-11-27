from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import require_role
from src.core.database import get_db
from src.schemas.analise import (
    CriarLaudoInput,
    CriarLaudoResponse,
    HomologarLaudoInput,
    HomologarLaudoResponse,
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
    summary="Listar laudos/amostras pertencentes ao escopo do analista autenticado",
)
async def listar_laudos(
    user: dict = Depends(require_role(("ANALISTA", "AUXILIAR"))),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista apenas os laudos pertencentes ao Analista Principal (ou ao Analista Principal vinculado ao Auxiliar).
    """
    return await AnaliseService.listar_laudos(usuario=user, db=db)


@router.post(
    "",
    response_model=CriarLaudoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar nova amostra / laudo para análise laboratorial",
)
async def criar_laudo(
    payload: CriarLaudoInput,
    user: dict = Depends(require_role(("ANALISTA", "AUXILIAR"))),
    db: AsyncSession = Depends(get_db),
):
    """
    Cadastra uma nova amostra/laudo e inicializa uma bancada limpa associada.
    Exige perfil de acesso ANALISTA ou AUXILIAR.
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
    user: dict = Depends(require_role(("ANALISTA", "AUXILIAR"))),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna os dados de bancada brutos, metadados da amostra, rascunho e curva de calibração.
    Valida que o laudo pertence ao escopo do analista autenticado.
    """
    return await AnaliseService.obter_analise(protocolo=protocolo, db=db, usuario=user)


@router.patch(
    "/{protocolo}/analise/rascunho",
    response_model=RascunhoSalvoResponse,
    status_code=status.HTTP_200_OK,
    summary="Salvar rascunho incremental da análise (Auto-Save)",
)
async def salvar_rascunho(
    protocolo: str,
    payload: RascunhoAnaliseInput,
    user: dict = Depends(require_role(("ANALISTA", "AUXILIAR"))),
    db: AsyncSession = Depends(get_db),
):
    """
    Salva incrementalmente dados parciais de bancada.
    Valida concorrência otimista com base no campo versaoEsperada.
    Exige perfil de acesso ANALISTA ou AUXILIAR do mesmo escopo.
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
    user: dict = Depends(require_role(("ANALISTA", "AUXILIAR"))),
    db: AsyncSession = Depends(get_db),
):
    """
    Valida a completude de bancada, reexecuta cálculos oficiais agronômicos,
    grava os resultados consolidados e avança o status para AGUARDANDO_HOMOLOGACAO.
    Exige perfil de acesso ANALISTA ou AUXILIAR do mesmo escopo.
    """
    return await AnaliseService.processar_analise(
        protocolo=protocolo,
        payload=payload,
        usuario=user,
        db=db,
    )


@router.post(
    "/{protocolo}/homologar",
    response_model=HomologarLaudoResponse,
    status_code=status.HTTP_200_OK,
    summary="Homologar e assinar digitalmente o laudo técnico",
)
async def homologar_laudo(
    protocolo: str,
    payload: HomologarLaudoInput,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    """
    Homologa o laudo técnico alterando seu status para CONCLUIDO e liberando
    a geração do PDF oficial sob demanda para o cliente.
    Restrito exclusivamente ao Analista Principal (role ANALISTA).
    """
    return await AnaliseService.homologar_laudo(
        protocolo=protocolo,
        payload=payload,
        usuario=user,
        db=db,
    )
