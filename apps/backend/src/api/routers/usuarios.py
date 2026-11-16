import html
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import require_role
from src.core.database import get_db
from src.models.usuario import Usuario
from src.schemas.auth import (
    AnalistaPrincipalItemResponse,
    AuxiliarItemResponse,
    CriarAnalistaRequest,
    CriarAuxiliarRequest,
    ListarAnalistasResponse,
    ListarAuxiliaresResponse,
)

router = APIRouter(prefix="/usuarios", tags=["Gestão de Usuários"])


async def _obter_analista_principal_logado(user: dict, db: AsyncSession) -> Usuario:
    email = (user.get("email") or user.get("sub") or "").strip().lower()
    stmt = select(Usuario).where(
        func.lower(Usuario.email) == email,
        Usuario.role == "ANALISTA",
        Usuario.ativo.is_(True),
    )
    res = await db.execute(stmt)
    analista = res.scalar_one_or_none()
    if not analista:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "sucesso": False,
                "mensagem": "Conta de Analista Principal não localizada no banco de dados.",
            },
        )
    return analista


@router.get(
    "/analistas",
    response_model=ListarAnalistasResponse,
    summary="Listar Analistas Principais cadastrados (Exclusivo PowerUser)",
)
async def listar_analistas_principais(
    user: dict = Depends(require_role("POWER_USER")),
    db: AsyncSession = Depends(get_db),
):
    stmt_analistas = (
        select(Usuario)
        .where(Usuario.role == "ANALISTA", Usuario.ativo.is_(True))
        .order_by(Usuario.criado_em.desc())
    )
    res_analistas = await db.execute(stmt_analistas)
    analistas = list(res_analistas.scalars().all())

    stmt_auxiliares = (
        select(Usuario)
        .where(Usuario.role == "AUXILIAR", Usuario.ativo.is_(True))
        .order_by(Usuario.criado_em.asc())
    )
    res_auxiliares = await db.execute(stmt_auxiliares)
    auxiliares = list(res_auxiliares.scalars().all())

    aux_por_principal: dict[uuid.UUID, list[AuxiliarItemResponse]] = {}
    for aux in auxiliares:
        if aux.analista_principal_id:
            aux_por_principal.setdefault(aux.analista_principal_id, []).append(
                AuxiliarItemResponse(
                    id=str(aux.id),
                    nome=aux.nome,
                    email=aux.email or "",
                    criadoEm=aux.criado_em.isoformat(),
                )
            )

    dados = [
        AnalistaPrincipalItemResponse(
            id=str(a.id),
            nome=a.nome,
            email=a.email or "",
            crea=a.crea or "",
            criadoEm=a.criado_em.isoformat(),
            auxiliares=aux_por_principal.get(a.id, []),
        )
        for a in analistas
    ]
    return ListarAnalistasResponse(sucesso=True, dados=dados)


@router.post(
    "/analistas",
    response_model=AnalistaPrincipalItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo Analista Principal com Nome, Gmail e CREA (Exclusivo PowerUser)",
)
async def criar_analista_principal(
    payload: CriarAnalistaRequest,
    user: dict = Depends(require_role("POWER_USER")),
    db: AsyncSession = Depends(get_db),
):
    email_limpo = payload.email.strip().lower()
    nome_limpo = html.escape(payload.nome.strip())
    crea_limpo = html.escape(payload.crea.strip())

    stmt_dup = select(Usuario).where(func.lower(Usuario.email) == email_limpo)
    res_dup = await db.execute(stmt_dup)
    if res_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "sucesso": False,
                "mensagem": f"O e-mail '{email_limpo}' já está cadastrado no sistema.",
            },
        )

    novo = Usuario(
        email=email_limpo,
        nome=nome_limpo,
        crea=crea_limpo,
        role="ANALISTA",
        provedor="GOOGLE",
        ativo=True,
    )
    db.add(novo)
    await db.commit()
    await db.refresh(novo)

    return AnalistaPrincipalItemResponse(
        id=str(novo.id),
        nome=novo.nome,
        email=novo.email or "",
        crea=novo.crea or "",
        criadoEm=novo.criado_em.isoformat(),
        auxiliares=[],
    )


@router.delete(
    "/analistas/{analista_id}",
    status_code=status.HTTP_200_OK,
    summary="Remover Analista Principal e seus auxiliares (Exclusivo PowerUser)",
)
async def remover_analista_principal(
    analista_id: str,
    user: dict = Depends(require_role("POWER_USER")),
    db: AsyncSession = Depends(get_db),
):
    try:
        uid = uuid.UUID(analista_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"sucesso": False, "mensagem": "ID de analista inválido."},
        ) from e

    stmt = select(Usuario).where(Usuario.id == uid, Usuario.role == "ANALISTA")
    res = await db.execute(stmt)
    analista = res.scalar_one_or_none()
    if not analista:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"sucesso": False, "mensagem": "Analista Principal não encontrado."},
        )

    await db.execute(
        delete(Usuario).where(Usuario.analista_principal_id == analista.id)
    )
    await db.delete(analista)
    await db.commit()

    return {"sucesso": True, "mensagem": "Analista Principal removido com sucesso."}


@router.get(
    "/auxiliares",
    response_model=ListarAuxiliaresResponse,
    summary="Listar contas Auxiliares vinculadas ao Analista Principal logado",
)
async def listar_auxiliares(
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    principal = await _obter_analista_principal_logado(user, db)
    stmt = (
        select(Usuario)
        .where(
            Usuario.role == "AUXILIAR",
            Usuario.analista_principal_id == principal.id,
            Usuario.ativo.is_(True),
        )
        .order_by(Usuario.criado_em.desc())
    )
    res = await db.execute(stmt)
    auxiliares = list(res.scalars().all())

    return ListarAuxiliaresResponse(
        sucesso=True,
        dados=[
            AuxiliarItemResponse(
                id=str(aux.id),
                nome=aux.nome,
                email=aux.email or "",
                criadoEm=aux.criado_em.isoformat(),
            )
            for aux in auxiliares
        ],
    )


@router.post(
    "/auxiliares",
    response_model=AuxiliarItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar conta Auxiliar vinculada ao Analista Principal logado",
)
async def criar_auxiliar(
    payload: CriarAuxiliarRequest,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    principal = await _obter_analista_principal_logado(user, db)
    email_limpo = payload.email.strip().lower()
    nome_limpo = html.escape(payload.nome.strip())

    stmt_dup = select(Usuario).where(func.lower(Usuario.email) == email_limpo)
    res_dup = await db.execute(stmt_dup)
    if res_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "sucesso": False,
                "mensagem": f"O e-mail '{email_limpo}' já está cadastrado no sistema.",
            },
        )

    novo_aux = Usuario(
        email=email_limpo,
        nome=nome_limpo,
        role="AUXILIAR",
        provedor="GOOGLE",
        analista_principal_id=principal.id,
        ativo=True,
    )
    db.add(novo_aux)
    await db.commit()
    await db.refresh(novo_aux)

    return AuxiliarItemResponse(
        id=str(novo_aux.id),
        nome=novo_aux.nome,
        email=novo_aux.email or "",
        criadoEm=novo_aux.criado_em.isoformat(),
    )


@router.delete(
    "/auxiliares/{auxiliar_id}",
    status_code=status.HTTP_200_OK,
    summary="Remover conta Auxiliar vinculada ao Analista Principal logado",
)
async def remover_auxiliar(
    auxiliar_id: str,
    user: dict = Depends(require_role("ANALISTA")),
    db: AsyncSession = Depends(get_db),
):
    principal = await _obter_analista_principal_logado(user, db)
    try:
        uid = uuid.UUID(auxiliar_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"sucesso": False, "mensagem": "ID de auxiliar inválido."},
        ) from e

    stmt = select(Usuario).where(
        Usuario.id == uid,
        Usuario.role == "AUXILIAR",
        Usuario.analista_principal_id == principal.id,
    )
    res = await db.execute(stmt)
    auxiliar = res.scalar_one_or_none()
    if not auxiliar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "sucesso": False,
                "mensagem": "Conta auxiliar não encontrada ou não vinculada a este analista.",
            },
        )

    await db.delete(auxiliar)
    await db.commit()

    return {"sucesso": True, "mensagem": "Conta auxiliar removida com sucesso."}
