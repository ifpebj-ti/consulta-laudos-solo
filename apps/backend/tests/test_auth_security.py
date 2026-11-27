import pytest
from fastapi.testclient import TestClient

from src.application.main import app
from src.core.security import create_access_token
from tests.conftest import TEST_POWERUSER_PASS


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


def test_login_local_poweruser_sucesso_e_falha(client):
    """Testa autenticação local do PowerUser no banco de dados (sem Google OAuth)."""
    # 1. Login válido com PowerUser
    res_ok = client.post(
        "/api/auth/login",
        json={
            "username": "PowerUser",
            "password": TEST_POWERUSER_PASS,
        },
    )
    assert res_ok.status_code == 200
    dados = res_ok.json()
    assert dados["sucesso"] is True
    assert dados["usuario"]["nome"] == "PowerUser"
    assert dados["usuario"]["role"] == "POWER_USER"
    token_pu = dados["token"]

    # Validar sessão no /api/auth/me
    res_me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token_pu}"},
    )
    assert res_me.status_code == 200
    assert res_me.json()["role"] == "POWER_USER"

    # 2. Senha incorreta -> 401
    res_wrong_pass = client.post(
        "/api/auth/login",
        json={"username": "PowerUser", "password": "senha-incorreta"},
    )
    assert res_wrong_pass.status_code == 401

    # 3. Usuário inexistente -> 401
    res_no_user = client.post(
        "/api/auth/login",
        json={"username": "Inexistente", "password": "qualquer"},
    )
    assert res_no_user.status_code == 401


def test_gestao_analistas_principais_e_auxiliares(client, monkeypatch):
    """
    Testa o fluxo completo:
    1. PowerUser cadastra Analista Principal (com Nome, Gmail e CREA).
    2. Analista Principal loga via Google OAuth e cadastra um Auxiliar.
    3. Auxiliar loga via Google OAuth e herda escopo, Nome e CREA do Analista Principal.
    4. Conta Gmail não cadastrada é rejeitada com 401.
    """
    from src.services.google_auth_service import GoogleAuthService

    # 1. Login PowerUser
    res_pu = client.post(
        "/api/auth/login",
        json={
            "username": "PowerUser",
            "password": TEST_POWERUSER_PASS,
        },
    )
    token_pu = res_pu.json()["token"]

    # 2. PowerUser cadastra Analista Principal
    res_create_ap = client.post(
        "/api/usuarios/analistas",
        json={
            "nome": "Dr. Roberto Agrônomo",
            "email": "roberto.principal@gmail.com",
            "crea": "CREA-PE 998877-D",
        },
        headers={"Authorization": f"Bearer {token_pu}"},
    )
    assert res_create_ap.status_code == 201
    ap_data = res_create_ap.json()
    assert ap_data["nome"] == "Dr. Roberto Agrônomo"
    assert ap_data["email"] == "roberto.principal@gmail.com"
    assert ap_data["crea"] == "CREA-PE 998877-D"

    # Listagem pelo PowerUser
    res_list_ap = client.get(
        "/api/usuarios/analistas",
        headers={"Authorization": f"Bearer {token_pu}"},
    )
    assert res_list_ap.status_code == 200
    emails_cadastrados = [a["email"] for a in res_list_ap.json()["dados"]]
    assert "roberto.principal@gmail.com" in emails_cadastrados

    # 3. Simula login Google do Analista Principal recém-cadastrado
    monkeypatch.setattr(
        GoogleAuthService,
        "verify_token",
        staticmethod(
            lambda t: {
                "email": "roberto.principal@gmail.com",
                "name": "Dr. Roberto Agrônomo",
                "email_verified": True,
            }
        ),
    )
    res_login_ap = client.post(
        "/api/auth/google",
        json={"idToken": "token-google-roberto"},
    )
    assert res_login_ap.status_code == 200
    token_ap = res_login_ap.json()["token"]
    assert res_login_ap.json()["usuario"]["crea"] == "CREA-PE 998877-D"

    # 4. Analista Principal cadastra conta Auxiliar
    res_create_aux = client.post(
        "/api/usuarios/auxiliares",
        json={
            "nome": "Lucas Auxiliar",
            "email": "lucas.auxiliar@gmail.com",
        },
        headers={"Authorization": f"Bearer {token_ap}"},
    )
    assert res_create_aux.status_code == 201
    aux_id = res_create_aux.json()["id"]

    # 5. Simula login Google do Auxiliar e verifica vínculo ao Analista Principal
    monkeypatch.setattr(
        GoogleAuthService,
        "verify_token",
        staticmethod(
            lambda t: {
                "email": "lucas.auxiliar@gmail.com",
                "name": "Lucas Auxiliar",
                "email_verified": True,
            }
        ),
    )
    res_login_aux = client.post(
        "/api/auth/google",
        json={"idToken": "token-google-lucas"},
    )
    assert res_login_aux.status_code == 200
    usuario_aux = res_login_aux.json()["usuario"]
    assert usuario_aux["role"] == "AUXILIAR"
    assert usuario_aux["escopoAnalistaId"] == "roberto.principal@gmail.com"
    assert usuario_aux["responsavelNome"] == "Dr. Roberto Agrônomo"
    assert usuario_aux["responsavelCrea"] == "CREA-PE 998877-D"

    # 6. Conta Gmail não cadastrada deve ser barrada com 401
    monkeypatch.setattr(
        GoogleAuthService,
        "verify_token",
        staticmethod(
            lambda t: {
                "email": "desconhecido@gmail.com",
                "name": "Intruso",
                "email_verified": True,
            }
        ),
    )
    res_intruso = client.post(
        "/api/auth/google",
        json={"idToken": "token-google-intruso"},
    )
    assert res_intruso.status_code == 401

    # 7. Remoção do auxiliar e do analista principal
    res_del_aux = client.delete(
        f"/api/usuarios/auxiliares/{aux_id}",
        headers={"Authorization": f"Bearer {token_ap}"},
    )
    assert res_del_aux.status_code == 200

    res_del_ap = client.delete(
        f"/api/usuarios/analistas/{ap_data['id']}",
        headers={"Authorization": f"Bearer {token_pu}"},
    )
    assert res_del_ap.status_code == 200
