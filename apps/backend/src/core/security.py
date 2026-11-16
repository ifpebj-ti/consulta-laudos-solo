import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from src.core.config import settings

PBKDF2_ITERATIONS = 600_000


class JWTError(Exception):
    """Exceção base para erros de manipulação de JWT."""


class InvalidTokenError(JWTError):
    pass


class ExpiredTokenError(JWTError):
    pass


def get_password_hash(password: str) -> str:
    """
    Gera hash seguro de senha utilizando PBKDF2-HMAC-SHA256 com salt aleatório de 16 bytes.
    """
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Valida uma senha em texto plano contra o hash PBKDF2-HMAC-SHA256 em tempo constante.
    """
    try:
        algoritmo, iteracoes_str, salt, hash_armazenado = hashed_password.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        iteracoes = int(iteracoes_str)
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iteracoes,
        )
        return secrets.compare_digest(dk.hex(), hash_armazenado)
    except Exception:
        return False


def create_access_token(
    subject: str,
    role: str,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
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
            if role in ("ANALISTA", "AUXILIAR", "POWER_USER")
            else settings.JWT_EXPIRATION_CLIENTE_HOURS
        )
        expire = now + timedelta(hours=hours)

    payload: dict[str, Any] = {
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


def decode_access_token(token: str) -> dict[str, Any]:
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
