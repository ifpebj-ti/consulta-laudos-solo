import asyncio
from typing import Any, Callable, Dict
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.security import ExpiredTokenError, InvalidTokenError, decode_access_token

# Extração de Bearer token HTTP
security_bearer = HTTPBearer(auto_error=True)

# Semáforo de concorrência para download de PDF (VULN-06)
pdf_download_semaphore = asyncio.Semaphore(10)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security_bearer),
) -> Dict[str, Any]:
    """
    Decodifica o token JWT garantindo integridade e expiração.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        return payload
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"sucesso": False, "mensagem": "Sessão expirada. Efetue login novamente."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"sucesso": False, "mensagem": "Token de autenticação inválido."},
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(allowed_role: str) -> Callable:
    """
    Garante que o usuário autenticado tenha a role exigida.
    """
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") != allowed_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"sucesso": False, "mensagem": f"Acesso negado para o perfil '{user.get('role')}'."},
            )
        return user

    return role_checker


def authorize_laudo_access(
    protocolo: str,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Valida autorização de acesso ao laudo:
    - ANALISTA: Acesso irrestrito a qualquer laudo.
    - CLIENTE: Acesso restrito apenas ao protocolo correspondente ao token (BOLA / IDOR mitigation).
    """
    role = user.get("role")
    protocolo_normalizado = protocolo.strip().upper()

    if role == "ANALISTA":
        return user

    if role == "CLIENTE":
        user_protocolo = user.get("protocolo", "").strip().upper()
        if user_protocolo != protocolo_normalizado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"sucesso": False, "mensagem": "Você não possui permissão para acessar este laudo."},
            )
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"sucesso": False, "mensagem": "Perfil de acesso não reconhecido."},
    )
