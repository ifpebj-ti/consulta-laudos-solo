import pytest
from pydantic import ValidationError

from src.core.config import DEV_JWT_SECRET_KEY, Settings

SEGREDO_FORTE = "s" * 48


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
        )


def test_producao_valida_com_configuracao_correta():
    cfg = criar(
        ENVIRONMENT="production",
        ENABLE_MOCK_AUTH=False,
        JWT_SECRET_KEY=SEGREDO_FORTE,
    )
    assert cfg.ENVIRONMENT == "production"


def test_segredo_curto_e_rejeitado():
    with pytest.raises(ValidationError, match="32 caracteres"):
        criar(JWT_SECRET_KEY="curto")
