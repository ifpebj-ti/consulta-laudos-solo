import logging
from typing import Any, Dict, Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from src.core.config import settings

logger = logging.getLogger(__name__)

# Mock controlado para ambiente de desenvolvimento seguro (SEC-001 / VULN-03)
MOCK_ANALISTA_PAYLOAD = {
    "email": "analista.dev@instituto.edu.br",
    "name": "Analista de Solo Dev",
    "email_verified": True,
}

# Lista autorizada temporária (whitelist) de analistas até persistência em banco
ANALISTAS_AUTORIZADOS = {
    "analista.dev@instituto.edu.br",
    "analista@instituto.edu.br",
}


class GoogleAuthError(Exception):
    pass


class GoogleAuthService:
    @staticmethod
    def verify_token(token_str: str) -> Dict[str, Any]:
        """
        Valida o Google ID Token segundo requisitos da VULN-04:
        1. aud == settings.GOOGLE_CLIENT_ID
        2. iss in Google issuers
        3. email_verified is True
        4. Checagem de whitelist de analistas autorizados
        """
        # Em modo dev com flag explícita, se não houver credencial do Google configurada, aceita token 'mock-dev-token'
        if settings.ENVIRONMENT == "dev" and settings.ENABLE_MOCK_AUTH:
            if token_str == "mock-dev-token" or not settings.GOOGLE_CLIENT_ID:
                logger.warning("AUDIT: Login de Analista realizado via MOCK_AUTH de desenvolvimento.")
                return MOCK_ANALISTA_PAYLOAD

        if not settings.GOOGLE_CLIENT_ID:
            raise GoogleAuthError("Serviço de autenticação Google não configurado no servidor.")

        try:
            request = google_requests.Request()
            payload = id_token.verify_oauth2_token(
                token_str,
                request,
                audience=settings.GOOGLE_CLIENT_ID,
            )

            # Valida emissor
            issuer = payload.get("iss")
            if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
                raise GoogleAuthError(f"Emissor do token inválido: {issuer}")

            # Valida e-mail verificado
            if not payload.get("email_verified"):
                raise GoogleAuthError("O e-mail da conta Google não está verificado.")

            email = payload.get("email")
            if not email or email not in ANALISTAS_AUTORIZADOS:
                logger.warning(f"AUDIT: Tentativa de acesso negada para e-mail não cadastrado como analista: {email}")
                raise GoogleAuthError("Usuário não cadastrado como analista ativo.")

            return payload

        except ValueError as e:
            raise GoogleAuthError(f"Token Google inválido ou expirado: {str(e)}") from e
