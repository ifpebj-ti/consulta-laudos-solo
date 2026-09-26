import pytest
from fastapi.testclient import TestClient

from src.application.main import app
from src.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def token_analista():
    return create_access_token("analista.dev@instituto.edu.br", "ANALISTA", extra_claims={"nome": "Analista Teste"})


@pytest.fixture
def token_cliente():
    return create_access_token("52998224725", "CLIENTE", extra_claims={"protocolo": "LAB-2026-0142"})


def test_obter_analise_analista_sucesso(client, token_analista):
    response = client.get(
        "/api/laudos/LAB-2026-0142/analise",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sucesso"] is True
    assert data["dados"]["protocolo"] == "LAB-2026-0142"
    assert data["dados"]["status"] in ["PENDENTE", "EM_ANALISE", "AGUARDANDO_HOMOLOGACAO"]
    assert "quimica" in data["dados"]["dadosBancada"]
    assert "granulometria" in data["dados"]["dadosBancada"]
    assert "calibracao" in data["dados"]["dadosBancada"]


def test_obter_analise_nao_encontrado(client, token_analista):
    response = client.get(
        "/api/laudos/INEXISTENTE-999/analise",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response.status_code == 404


def test_obter_analise_protecao_rbac(client, token_cliente):
    # Cliente comum tentando acessar bancada -> 403 Forbidden
    response = client.get(
        "/api/laudos/LAB-2026-0142/analise",
        headers={"Authorization": f"Bearer {token_cliente}"},
    )
    assert response.status_code == 403

    # Sem autenticação -> 401 Unauthorized ou 403 Forbidden
    response_no_auth = client.get("/api/laudos/LAB-2026-0142/analise")
    assert response_no_auth.status_code in [401, 403]


def test_salvar_rascunho_e_concorrencia_otimista(client, token_analista):
    # 1. Obter a versão atual
    get_res = client.get(
        "/api/laudos/LAB-2026-0142/analise",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    versao_atual = get_res.json()["dados"]["versao"]

    # 2. Salvar rascunho com a versão correta
    rascunho_payload = {
        "versaoEsperada": versao_atual,
        "quimica": {
            "ph": 5.6,
        },
    }
    patch_res = client.patch(
        "/api/laudos/LAB-2026-0142/analise/rascunho",
        json=rascunho_payload,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["sucesso"] is True
    nova_versao = patch_data["dados"]["novaVersao"]
    assert nova_versao == versao_atual + 1

    # 3. Teste de Bloqueio Otimista: tentar enviar novamente com a versão defasada
    patch_conflito = client.patch(
        "/api/laudos/LAB-2026-0142/analise/rascunho",
        json=rascunho_payload,  # usa versao_atual antiga
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert patch_conflito.status_code == 409
    assert patch_conflito.json()["detail"]["codigoErro"] == "CONFLITO_CONCORRENCIA"


def test_processar_analise_rejeicao_incompleto(client, token_analista):
    # Envio com tfsa <= 0 ou calibração a = 0
    get_res = client.get(
        "/api/laudos/LAB-2026-0142/analise",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    versao = get_res.json()["dados"]["versao"]

    payload_invalido = {
        "versaoEsperada": versao,
        "quimica": {
            "ph": 5.4,
            "fosforoAbsBruta": 0.612,
            "sodioMgL": 12.0,
            "potassioMgL": 45.0,
            "calcio": {"medido": 2.1, "branco": 0.0},
            "magnesio": {"medido": 0.85, "branco": 0.0},
            "aluminio": {"medido": 0.3, "branco": 0.0},
            "acidezPotencial": {"medido": 3.2, "branco": 0.0},
        },
        "granulometria": {
            "tfsa": 0.0,  # INVÁLIDO
            "areiaBecker": 15.9312,
            "areiaBeckerVazio": 4.492,
            "argilaBecker": 4.5824,
            "argilaBeckerVazio": 4.4899,
            "naohBecker": 4.479,
            "naohBeckerVazio": 4.4711,
        },
        "calibracao": {
            "a": 0.0,  # INVÁLIDO
            "b": 0.019,
            "r2": 0.9998,
        },
    }

    res = client.post(
        "/api/laudos/LAB-2026-0142/analise/processar",
        json=payload_invalido,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert detail["sucesso"] is False
    assert len(detail["erros"]) >= 2


def test_processar_analise_sucesso_caso_spec(client, token_analista):
    get_res = client.get(
        "/api/laudos/LAB-2026-0142/analise",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    versao = get_res.json()["dados"]["versao"]

    payload_completo = {
        "versaoEsperada": versao,
        "quimica": {
            "ph": 5.4,
            "fosforoAbsBruta": 0.612,
            "sodioMgL": 12.0,
            "potassioMgL": 45.0,
            "calcio": {"medido": 2.1, "branco": 0.0},
            "magnesio": {"medido": 0.85, "branco": 0.0},
            "aluminio": {"medido": 0.3, "branco": 0.0},
            "acidezPotencial": {"medido": 3.2, "branco": 0.0},
        },
        "granulometria": {
            "tfsa": 20.0,
            "areiaBecker": 15.9312,
            "areiaBeckerVazio": 4.492,
            "argilaBecker": 4.5824,
            "argilaBeckerVazio": 4.4899,
            "naohBecker": 4.479,
            "naohBeckerVazio": 4.4711,
        },
        "calibracao": {
            "a": 0.033,
            "b": 0.019,
            "r2": 0.9998,
            "pontos": [
                {"x": 0.0, "y": 0.02},
                {"x": 5.0, "y": 0.18},
                {"x": 10.0, "y": 0.35},
                {"x": 15.0, "y": 0.52},
                {"x": 20.0, "y": 0.68},
            ],
        },
    }

    res = client.post(
        "/api/laudos/LAB-2026-0142/analise/processar",
        json=payload_completo,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["sucesso"] is True
    assert data["dados"]["status"] == "AGUARDANDO_HOMOLOGACAO"
    assert data["dados"]["novaVersao"] == versao + 1

    oficiais = data["dados"]["calculosOficiais"]
    # Validações exatas de acordo com a SPEC-002:
    assert oficiais["valoresLiquidos"]["calcio"] == 2.1
    assert oficiais["valoresLiquidos"]["magnesio"] == 0.85
    assert oficiais["valoresLiquidos"]["aluminio"] == 0.3
    assert oficiais["valoresLiquidos"]["acidezPotencial"] == 3.2

    assert oficiais["conversoes"]["sodioCmolc"] == pytest.approx(0.0522, abs=1e-3)
    assert oficiais["conversoes"]["potassioCmolc"] == pytest.approx(0.1151, abs=1e-3)

    assert oficiais["complexoSortivo"]["somaBases"] == pytest.approx(3.1173, abs=1e-3)
    assert oficiais["complexoSortivo"]["ctcEfetiva"] == pytest.approx(3.4173, abs=1e-3)
    assert oficiais["complexoSortivo"]["ctcPotencial"] == pytest.approx(6.3173, abs=1e-3)
    assert oficiais["complexoSortivo"]["saturacaoBases"] == pytest.approx(49.35, abs=1e-1)
    assert oficiais["complexoSortivo"]["saturacaoAluminio"] == pytest.approx(8.78, abs=1e-1)
    assert oficiais["complexoSortivo"]["relacaoCaMg"] == pytest.approx(2.47, abs=1e-2)

    assert oficiais["granulometria"]["pesoAreia"] == pytest.approx(11.4392, abs=1e-3)
    assert oficiais["granulometria"]["pctAreia"] == pytest.approx(57.2, abs=1e-1)
    assert oficiais["granulometria"]["pctArgila"] == pytest.approx(42.3, abs=1e-1)
    assert oficiais["granulometria"]["pctSilte"] == pytest.approx(0.5, abs=1e-1)
    assert oficiais["granulometria"]["classeTextural"] == "Argilo Arenoso"

    assert oficiais["fosforo"]["curva"] == pytest.approx(179.7, abs=1e-1)


def test_criar_laudo_sucesso_e_duplicidade(client, token_analista):
    # 1. Criação bem sucedida
    novo_protocolo = "LAB-TESTE-2026-99"
    payload = {
        "protocolo": novo_protocolo,
        "cpf_cliente": "529.982.247-25",
        "cliente_nome": "Carlos Silva & Filhos <script>",
        "propriedade": "Fazenda Modelo",
        "localizacao": "Belo Jardim - PE",
    }
    res = client.post(
        "/api/laudos",
        json=payload,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res.status_code == 201
    dados = res.json()["dados"]
    assert dados["protocolo"] == novo_protocolo
    assert dados["cliente_nome"] == "Carlos Silva &amp; Filhos &lt;script&gt;"  # Sanitizado contra XSS
    assert dados["status"] == "EM_ANALISE"

    # 2. Conflito ao tentar recriar o mesmo protocolo
    res_duplicado = client.post(
        "/api/laudos",
        json=payload,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_duplicado.status_code == 409

    # 3. Validação de CPF inválido (menos de 11 dígitos)
    payload_cpf_invalido = {**payload, "protocolo": "LAB-TESTE-OUTRO", "cpf_cliente": "12345"}
    res_cpf_err = client.post(
        "/api/laudos",
        json=payload_cpf_invalido,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_cpf_err.status_code == 422

