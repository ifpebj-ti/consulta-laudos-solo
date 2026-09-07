from fastapi import APIRouter, Depends, HTTPException, Request, status
from src.api.deps import get_current_user
from src.core.limiter import limiter
from src.core.security import create_access_token
from src.schemas.auth import (
    LoginClienteRequest,
    LoginGoogleRequest,
    LoginGoogleResponse,
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


@router.post("/google", response_model=LoginGoogleResponse)
@limiter.limit("10/minute")
async def login_analista_google(
    request: Request,
    payload: LoginGoogleRequest,
):
    """
    Autenticação do Analista via Google OAuth ID Token.
    Rate limit de 10 req/min por IP.
    """
    try:
        dados_google = GoogleAuthService.verify_token(payload.idToken)
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"sucesso": False, "mensagem": str(e)},
        )

    email = dados_google.get("email")
    nome = dados_google.get("name", "Analista de Solo")

    token = create_access_token(
        subject=email,
        role="ANALISTA",
        extra_claims={"nome": nome, "email": email},
    )

    return LoginGoogleResponse(
        sucesso=True,
        token=token,
        tipoToken="Bearer",
        usuario=UsuarioAnalistaResponse(
            nome=nome,
            email=email,
            role="ANALISTA",
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
            detail={"sucesso": False, "mensagem": "Dados de consulta inválidos ou laudo indisponível."},
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
        protocolo=current_user.get("protocolo"),
    )
