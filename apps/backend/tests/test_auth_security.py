import pytest
from fastapi.testclient import TestClient

from src.application.main import app
from src.core.security import create_access_token


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    # Checagem de headers de segurança
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"


def test_login_analista_google_mock_dev(client):
    """Testa login do analista via mock seguro em dev."""
    response = client.post(
        "/api/auth/google",
        json={"idToken": "mock-dev-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sucesso"] is True
    assert data["usuario"]["role"] == "ANALISTA"
    assert "token" in data


def test_login_cliente_sucesso(client):
    """Testa autenticação de cliente com protocolo e CPF válidos."""
    response = client.post(
        "/api/auth/cliente",
        json={"protocolo": "20101.2306", "cpf": "52998224725"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sucesso"] is True
    assert "token" in data
    assert data["laudo"]["protocolo"] == "20101.2306"
    assert data["laudo"]["cliente"]["cpfMascarado"] == "***.982.247-**"


def test_login_cliente_cpf_invalido_rejeicao_422(client):
    """Testa rejeição estrita de CPF com dígitos incorretos."""
    response = client.post(
        "/api/auth/cliente",
        json={"protocolo": "20101.2306", "cpf": "11111111111"},
    )
    # Pydantic validation error retorna 422
    assert response.status_code == 422


def test_login_cliente_nao_encontrado_unificado_401(client):
    """Mitigação VULN-02: Retorna 401 unificado para protocolo/CPF não casados."""
    response = client.post(
        "/api/auth/cliente",
        json={"protocolo": "99999.9999", "cpf": "52998224725"},
    )
    assert response.status_code == 401
    assert "inválidos ou laudo indisponível" in response.json()["detail"]["mensagem"]


def test_me_endpoint_com_token_analista(client):
    """Testa checagem de sessão com token de analista."""
    token = create_access_token(
        "analista@instituto.edu.br", "ANALISTA", extra_claims={"nome": "Prof. Analista"}
    )
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "ANALISTA"
    assert data["sub"] == "analista@instituto.edu.br"


def test_bola_idor_mitigation_cliente_tentando_outro_laudo(client):
    """Mitigação BOLA: Cliente com token de um protocolo não pode baixar outro."""
    token_cliente = create_access_token(
        "52998224725", "CLIENTE", extra_claims={"protocolo": "20101.2306"}
    )

    # Tentativa de acessar outro protocolo diferente
    response = client.get(
        "/api/laudos/2026-SOLO-00123/pdf",
        headers={"Authorization": f"Bearer {token_cliente}"},
    )
    assert response.status_code == 403
    assert "não possui permissão" in response.json()["detail"]["mensagem"]


def test_path_traversal_mitigation_no_pdf(client):
    """Mitigação VULN-05: Tentativa de ../ deve ser barrada imediatamente (pelo router ou pela validação)."""
    token_analista = create_access_token("analista@instituto.edu.br", "ANALISTA")
    response = client.get(
        "/api/laudos/..%2F..%2Fetc%2Fpasswd/pdf",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response.status_code in [400, 404]

    # Tentativa de traversal no mesmo segmento
    response_dotdot = client.get(
        "/api/laudos/..protocolo/pdf",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response_dotdot.status_code == 400
    assert (
        response_dotdot.json()["detail"]["mensagem"]
        == "Protocolo com caracteres inválidos."
    )


def test_download_pdf_caracteres_invalidos(client):
    """Rejeita protocolos com caracteres especiais potencialmente maliciosos."""
    token_analista = create_access_token("analista@instituto.edu.br", "ANALISTA")
    for invalido in ["PROTO;rm", "LAUDO|123", "PROTO$VAR", "PROTO`CMD`"]:
        response = client.get(
            f"/api/laudos/{invalido}/pdf",
            headers={"Authorization": f"Bearer {token_analista}"},
        )
        assert response.status_code == 400


def test_download_pdf_nao_encontrado_404(client):
    """Protocolo bem formatado mas sem arquivo físico deve retornar 404."""
    token_analista = create_access_token("analista@instituto.edu.br", "ANALISTA")
    response = client.get(
        "/api/laudos/2026-INEXISTENTE/pdf",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"]["mensagem"]


def test_download_pdf_sucesso(client, tmp_path, monkeypatch):
    """Download de PDF válido existente no storage."""
    from src.core.config import settings

    # Cria pasta temporária e arquivo PDF simulado
    fake_storage = tmp_path / "storage"
    fake_storage.mkdir()
    pdf_file = fake_storage / "20101.2306.pdf"
    pdf_file.write_bytes(b"%PDF-1.4 mock content")

    monkeypatch.setattr(settings, "STORAGE_DIR", str(fake_storage))

    token_analista = create_access_token("analista@instituto.edu.br", "ANALISTA")
    response = client.get(
        "/api/laudos/20101.2306/pdf",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content == b"%PDF-1.4 mock content"
