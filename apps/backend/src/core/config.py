import os
import sys
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"  # "dev", "staging", "production"
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "Consulta Laudos Solo"

    # Segurança JWT
    JWT_SECRET_KEY: str = "chave-super-secreta-de-desenvolvimento-local-minimo-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_ANALISTA_HOURS: int = 8
    JWT_EXPIRATION_CLIENTE_HOURS: int = 2

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""

    # Mock Auth para ambiente dev
    ENABLE_MOCK_AUTH: bool = True

    # Armazenamento e PDFs
    STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret_entropy(cls, v: str) -> str:
        if len(v.strip()) < 32:
            raise ValueError(
                "A chave JWT_SECRET_KEY deve possuir no mínimo 32 caracteres (256 bits) para garantir segurança criptográfica."
            )
        return v

    @field_validator("ENABLE_MOCK_AUTH")
    @classmethod
    def prevent_mock_in_production(cls, v: bool, info) -> bool:
        env = info.data.get("ENVIRONMENT", "dev").lower()
        if env == "production" and v is True:
            raise ValueError(
                "VULN-03 CRITICAL: ENABLE_MOCK_AUTH=True é estritamente proibido em ambiente de produção (ENVIRONMENT=production)."
            )
        return v


settings = Settings()
