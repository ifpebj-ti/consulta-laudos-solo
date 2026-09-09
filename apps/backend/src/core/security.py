from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import uuid
import jwt

from src.core.config import settings


class JWTError(Exception):
    """Exceção base para erros de manipulação de JWT."""
    pass


class InvalidTokenError(JWTError):
    pass


class ExpiredTokenError(JWTError):
    pass


def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Gera um token JWT com algoritmo forçado HS256 e UUID (jti) para revogabilidade.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        hours = (
            settings.JWT_EXPIRATION_ANALISTA_HOURS
            if role == "ANALISTA"
            else settings.JWT_EXPIRATION_CLIENTE_HOURS
        )
        expire = now + timedelta(hours=hours)

    payload: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodifica e valida o JWT forçando algoritmos permitidos (mitiga Algorithm Confusion).
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],  # Força explicitamente HS256
            options={"require": ["sub", "role", "exp", "iat"]},
        )
        return payload
    except jwt.ExpiredSignatureError as e:
        raise ExpiredTokenError("Token expirado.") from e
    except jwt.PyJWTError as e:
        raise InvalidTokenError("Token inválido ou assinatura corrompida.") from e
