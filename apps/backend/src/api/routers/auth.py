from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.core.database import get_db
from src.core.limiter import limiter
from src.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from src.models.usuario import Usuario
from src.schemas.auth import (
    LoginClienteRequest,
    LoginGoogleRequest,
    LoginGoogleResponse,
    LoginLocalRequest,
    UsuarioAnalistaResponse,
    UsuarioMeResponse,
)
from src.schemas.laudo import (
    ClienteInfoResponse,
    LaudoDetalheResponse,
    LoginClienteResponse,
    ParametrosSoloResponse,
)
from src.services.google_auth_service import GoogleAuthError, GoogleAuthService
from src.services.laudo_service import LaudoAuthService

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Hash dummy pré-computado para mitigar timing attack quando usuário não existe
DUMMY_PASSWORD_HASH = get_password_hash("dummy-timing-mitigation-secret")


@router.post("/login", response_model=LoginGoogleResponse)
@limiter.limit("10/minute")
async def login_local(
    request: Request,
    payload: LoginLocalRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Autenticação local via usuário e senha no banco de dados (ex.: PowerUser).
    Rate limit de 10 req/min por IP.
    """
    identificador = payload.username.strip()

    stmt = select(Usuario).where(
        (Usuario.username == identificador)
        | (func.lower(Usuario.email) == identificador.lower())
    )
    res = await db.execute(stmt)
    usuario = res.scalar_one_or_none()

    if not usuario or not usuario.ativo or not usuario.senha_hash:
        verify_password(payload.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "sucesso": False,
                "mensagem": "Usuário ou senha inválidos.",
            },
        )

    if not verify_password(payload.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "sucesso": False,
                "mensagem": "Usuário ou senha inválidos.",
            },
        )

    sub = usuario.username or usuario.email or str(usuario.id)
    email_claim = usuario.email or usuario.username or sub
    escopo_id = email_claim

    token = create_access_token(
        subject=sub,
        role=usuario.role,
        extra_claims={
            "id": str(usuario.id),
            "nome": usuario.nome,
            "email": email_claim,
            "crea": usuario.crea,
            "escopoAnalistaId": escopo_id,
            "responsavelNome": usuario.nome,
            "responsavelCrea": usuario.crea,
        },
    )

    return LoginGoogleResponse(
        sucesso=True,
        token=token,
        tipoToken="Bearer",
        usuario=UsuarioAnalistaResponse(
            id=str(usuario.id),
            nome=usuario.nome,
            email=email_claim,
            role=usuario.role,
            crea=usuario.crea,
            escopoAnalistaId=escopo_id,
            responsavelNome=usuario.nome,
            responsavelCrea=usuario.crea,
        ),
    )


@router.post("/google", response_model=LoginGoogleResponse)
@limiter.limit("10/minute")
async def login_analista_google(
    request: Request,
    payload: LoginGoogleRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Autenticação de Analista Principal ou Auxiliar via Google OAuth ID Token.
    Valida a conta diretamente na tabela `usuarios` do banco de dados.
    Rate limit de 10 req/min por IP.
    """
    try:
        dados_google = GoogleAuthService.verify_token(payload.idToken)
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"sucesso": False, "mensagem": str(e)},
        ) from e

    email = (dados_google.get("email") or "").strip().lower()
    stmt = select(Usuario).where(
        func.lower(Usuario.email) == email,
        Usuario.ativo.is_(True),
    )
    res = await db.execute(stmt)
    usuario = res.scalar_one_or_none()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "sucesso": False,
                "mensagem": "Conta Google não autorizada. Solicite o cadastro ao administrador ou ao Analista Principal.",
            },
        )

    escopo_id = usuario.email or str(usuario.id)
    responsavel_nome = usuario.nome
    responsavel_crea = usuario.crea

    if usuario.role == "AUXILIAR":
        if not usuario.analista_principal_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "sucesso": False,
                    "mensagem": "Conta auxiliar sem vínculo com um Analista Principal ativo.",
                },
            )
        stmt_principal = select(Usuario).where(
            Usuario.id == usuario.analista_principal_id,
            Usuario.ativo.is_(True),
        )
        res_principal = await db.execute(stmt_principal)
        principal = res_principal.scalar_one_or_none()
        if not principal:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "sucesso": False,
                    "mensagem": "O Analista Principal vinculado a esta conta auxiliar não está ativo.",
                },
            )
        escopo_id = principal.email or str(principal.id)
        responsavel_nome = principal.nome
        responsavel_crea = principal.crea

    token = create_access_token(
        subject=usuario.email or str(usuario.id),
        role=usuario.role,
        extra_claims={
            "id": str(usuario.id),
            "nome": usuario.nome,
            "email": usuario.email,
            "crea": usuario.crea,
            "escopoAnalistaId": escopo_id,
            "responsavelNome": responsavel_nome,
            "responsavelCrea": responsavel_crea,
        },
    )

    return LoginGoogleResponse(
        sucesso=True,
        token=token,
        tipoToken="Bearer",
        usuario=UsuarioAnalistaResponse(
            id=str(usuario.id),
            nome=usuario.nome,
            email=usuario.email or email,
            role=usuario.role,
            crea=usuario.crea,
            escopoAnalistaId=escopo_id,
            responsavelNome=responsavel_nome,
            responsavelCrea=responsavel_crea,
        ),
    )


@router.post("/cliente", response_model=LoginClienteResponse)
@limiter.limit("5/minute")
async def login_cliente_laudo(
    request: Request,
    payload: LoginClienteRequest,
):
    """
    Autenticação do Cliente via Protocolo + CPF.
    Rate limit de 5 req/min por IP.
    Retorna os dados do laudo e o JWT para download do PDF.
    """
    laudo = LaudoAuthService.autenticar_cliente(payload.protocolo, payload.cpf)

    if not laudo:
        # VULN-02: Resposta unificada neutra para impedir enumeração e timing attack
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "sucesso": False,
                "mensagem": "Dados de consulta inválidos ou laudo indisponível.",
            },
        )

    # Emite token restrito ao laudo
    token = create_access_token(
        subject=payload.cpf,
        role="CLIENTE",
        extra_claims={"protocolo": payload.protocolo},
    )

    detalhe_laudo = LaudoDetalheResponse(
        protocolo=laudo["protocolo"],
        status=laudo["status"],
        cliente=ClienteInfoResponse(
            nome=laudo["cliente_nome"],
            cpfMascarado=LaudoAuthService.mascarar_cpf(payload.cpf),
        ),
        propriedade=laudo["propriedade"],
        dataEmissao=laudo["data_emissao"],
        parametrosSolo=ParametrosSoloResponse(
            ph=laudo["parametros"]["ph"],
            materiaOrganica=laudo["parametros"]["materiaOrganica"],
            fosforo=laudo["parametros"]["fosforo"],
            potassio=laudo["parametros"]["potassio"],
        ),
        temPdfDisponivel=laudo.get("tem_pdf", False),
    )

    return LoginClienteResponse(
        sucesso=True,
        token=token,
        tipoToken="Bearer",
        laudo=detalhe_laudo,
    )


@router.get("/me", response_model=UsuarioMeResponse)
async def checar_sessao_atual(
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna informações da sessão ativa decodificadas do JWT.
    """
    return UsuarioMeResponse(
        sub=current_user.get("sub"),
        role=current_user.get("role"),
        nome=current_user.get("nome"),
        email=current_user.get("email"),
        crea=current_user.get("crea"),
        escopoAnalistaId=current_user.get("escopoAnalistaId"),
        responsavelNome=current_user.get("responsavelNome"),
        responsavelCrea=current_user.get("responsavelCrea"),
        protocolo=current_user.get("protocolo"),
    )
