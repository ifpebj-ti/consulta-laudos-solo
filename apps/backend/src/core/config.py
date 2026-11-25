import os

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Valor conhecido (público no repositório): só é aceito em dev/test.
DEV_JWT_SECRET_KEY = "chave-super-secreta-de-desenvolvimento-local-minimo-32-chars"
AMBIENTES_SEGUROS = {"staging", "production"}


class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"  # "dev", "staging", "production"
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "Consulta Laudos Solo"

    # Segurança JWT
    JWT_SECRET_KEY: str = DEV_JWT_SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_ANALISTA_HOURS: int = 8
    JWT_EXPIRATION_CLIENTE_HOURS: int = 2

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""

    # Mock Auth para ambiente dev
    ENABLE_MOCK_AUTH: bool = True

    # Armazenamento e PDFs
    STORAGE_DIR: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "storage")
    )

    # Banco de Dados (PostgreSQL oficial com fallback SQLite assíncrono para dev/testes)
    DATABASE_URL: str = "sqlite+aiosqlite:///./laudos.db"

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret_entropy(cls, v: str) -> str:
        if len(v.strip()) < 32:
            raise ValueError(
                "A chave JWT_SECRET_KEY deve possuir no mínimo 32 caracteres (256 bits) para garantir segurança criptográfica."
            )
        return v

    @model_validator(mode="after")
    def validate_secure_environments(self) -> "Settings":
        """Regras que valem também para valores default (field validators não rodam neles)."""
        if self.ENVIRONMENT.lower() not in AMBIENTES_SEGUROS:
            return self
        if self.ENABLE_MOCK_AUTH:
            raise ValueError(
                "VULN-03 CRITICAL: ENABLE_MOCK_AUTH=True é estritamente proibido em staging/production."
            )
        if self.JWT_SECRET_KEY == DEV_JWT_SECRET_KEY:
            raise ValueError(
                "JWT_SECRET_KEY padrão de desenvolvimento não pode ser usada em staging/production. Defina um segredo próprio."
            )
        return self


settings = Settings()
