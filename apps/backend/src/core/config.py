import os

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Valor conhecido (público no repositório): só é aceito em dev/test.
DEV_JWT_SECRET_KEY = "chave-super-secreta-de-desenvolvimento-local-minimo-32-chars"
AMBIENTES_SEGUROS = {"staging", "production"}
ORIGENS_DEV = (
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
)


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

    # CORS: origens permitidas (JSON, ex.: ["https://laudos.exemplo.br"]).
    # Vazio: dev usa as origens locais abaixo; staging/production exigem valor explícito.
    CORS_ALLOWED_ORIGINS: list[str] = []

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

    @property
    def cors_origins(self) -> list[str]:
        if self.CORS_ALLOWED_ORIGINS:
            return self.CORS_ALLOWED_ORIGINS
        return list(ORIGENS_DEV)

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
        if not self.CORS_ALLOWED_ORIGINS or "*" in self.CORS_ALLOWED_ORIGINS:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS deve listar as origens do frontend (sem *) em staging/production."
            )
        return self


settings = Settings()
