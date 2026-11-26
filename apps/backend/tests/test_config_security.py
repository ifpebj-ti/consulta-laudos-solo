import pytest
from pydantic import ValidationError

from src.core.config import DEV_JWT_SECRET_KEY, Settings

SEGREDO_FORTE = "s" * 48
ORIGENS = ["https://laudos.exemplo.br"]


def criar(**valores) -> Settings:
    return Settings(_env_file=None, **valores)


def test_dev_aceita_defaults():
    cfg = criar(ENVIRONMENT="dev")
    assert cfg.ENABLE_MOCK_AUTH is True


@pytest.mark.parametrize("ambiente", ["production", "staging"])
def test_ambientes_seguros_rejeitam_mock_auth_por_padrao(ambiente):
    with pytest.raises(ValidationError, match="ENABLE_MOCK_AUTH"):
        criar(ENVIRONMENT=ambiente, JWT_SECRET_KEY=SEGREDO_FORTE)


@pytest.mark.parametrize("ambiente", ["production", "staging"])
def test_ambientes_seguros_rejeitam_segredo_de_desenvolvimento(ambiente):
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        criar(
            ENVIRONMENT=ambiente,
            ENABLE_MOCK_AUTH=False,
            JWT_SECRET_KEY=DEV_JWT_SECRET_KEY,
            CORS_ALLOWED_ORIGINS=ORIGENS,
        )


def test_producao_valida_com_configuracao_correta():
    cfg = criar(
        ENVIRONMENT="production",
        ENABLE_MOCK_AUTH=False,
        JWT_SECRET_KEY=SEGREDO_FORTE,
        CORS_ALLOWED_ORIGINS=ORIGENS,
    )
    assert cfg.ENVIRONMENT == "production"
    assert cfg.cors_origins == ORIGENS


def test_segredo_curto_e_rejeitado():
    with pytest.raises(ValidationError, match="32 caracteres"):
        criar(JWT_SECRET_KEY="curto")


@pytest.mark.parametrize("origens", [[], ["*"], ["https://a.br", "*"]])
def test_producao_exige_origens_cors_explicitas(origens):
    with pytest.raises(ValidationError, match="CORS_ALLOWED_ORIGINS"):
        criar(
            ENVIRONMENT="production",
            ENABLE_MOCK_AUTH=False,
            JWT_SECRET_KEY=SEGREDO_FORTE,
            CORS_ALLOWED_ORIGINS=origens,
        )


def test_dev_usa_somente_origens_locais_sem_curinga():
    cfg = criar(ENVIRONMENT="dev")
    assert "*" not in cfg.cors_origins
    assert "http://localhost:5173" in cfg.cors_origins
