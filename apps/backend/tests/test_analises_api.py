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
    return create_access_token(
        "analista.dev@instituto.edu.br",
        "ANALISTA",
        extra_claims={"nome": "Analista Teste"},
    )


@pytest.fixture
def token_cliente():
    return create_access_token(
        "52998224725", "CLIENTE", extra_claims={"protocolo": "LAB-2026-0142"}
    )


def test_obter_analise_analista_sucesso(client, token_analista):
    response = client.get(
        "/api/laudos/LAB-2026-0142/analise",
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sucesso"] is True
    assert data["dados"]["protocolo"] == "LAB-2026-0142"
    assert data["dados"]["status"] in [
        "PENDENTE",
        "EM_ANALISE",
        "AGUARDANDO_HOMOLOGACAO",
    ]
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
    assert oficiais["complexoSortivo"]["ctcPotencial"] == pytest.approx(
        6.3173, abs=1e-3
    )
    assert oficiais["complexoSortivo"]["saturacaoBases"] == pytest.approx(
        49.35, abs=1e-1
    )
    assert oficiais["complexoSortivo"]["saturacaoAluminio"] == pytest.approx(
        8.78, abs=1e-1
    )
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
        "dataRecebimento": "2026-10-07",
        "tipoAnalise": "fisico_quimica",
        "culturaExistente": "Pastagem",
        "email": "carlos@exemplo.com",
        "telefone": "81999998888",
    }
    res = client.post(
        "/api/laudos",
        json=payload,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res.status_code == 201
    dados = res.json()["dados"]
    assert dados["protocolo"] == novo_protocolo
    assert (
        dados["cliente_nome"] == "Carlos Silva &amp; Filhos &lt;script&gt;"
    )  # Sanitizado contra XSS
    assert dados["status"] == "EM_ANALISE"

    # 2. Conflito ao tentar recriar o mesmo protocolo
    res_duplicado = client.post(
        "/api/laudos",
        json=payload,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_duplicado.status_code == 409

    # 3. Validação de CPF inválido (menos de 11 dígitos)
    payload_cpf_invalido = {
        **payload,
        "protocolo": "LAB-TESTE-OUTRO",
        "cpf_cliente": "12345",
    }
    res_cpf_err = client.post(
        "/api/laudos",
        json=payload_cpf_invalido,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_cpf_err.status_code == 422


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("tipoAnalise", "biologica"),
        ("email", "email-invalido"),
        ("telefone", "1234"),
        ("dataRecebimento", "07/10/2026"),
    ],
)
def test_criar_laudo_rejeita_campos_invalidos(client, token_analista, campo, valor):
    payload = {
        "protocolo": f"LAB-INVALIDO-{campo}",
        "cpf_cliente": "52998224725",
        "cliente_nome": "Carlos Silva",
        "propriedade": "Fazenda Modelo",
        campo: valor,
    }
    res = client.post(
        "/api/laudos",
        json=payload,
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res.status_code == 422


def test_isolamento_entre_equipes_e_acesso_auxiliar(client):
    """
    Garante que:
    1. Analista Principal A e seu Auxiliar A1 compartilham Read/Write nos laudos da Equipe A (com Nome e CREA do Analista A).
    2. Analista Principal B (outra conta) NÃO vê os laudos da Equipe A e recebe 403 Forbidden se tentar acessá-los ou editá-los.
    3. Concorrência otimista (409 Conflict) protege contra sobrescrita simultânea (ex.: tablet + notebook ou Analista + Auxiliar).
    """
    token_analista_a = create_access_token(
        "analista.a@gmail.com",
        "ANALISTA",
        extra_claims={
            "nome": "Dra. Ana Solos",
            "email": "analista.a@gmail.com",
            "crea": "CREA-PE 111222-D",
            "escopoAnalistaId": "analista.a@gmail.com",
            "responsavelNome": "Dra. Ana Solos",
            "responsavelCrea": "CREA-PE 111222-D",
        },
    )
    token_auxiliar_a1 = create_access_token(
        "auxiliar.a1@gmail.com",
        "AUXILIAR",
        extra_claims={
            "nome": "Pedro Auxiliar",
            "email": "auxiliar.a1@gmail.com",
            "escopoAnalistaId": "analista.a@gmail.com",
            "responsavelNome": "Dra. Ana Solos",
            "responsavelCrea": "CREA-PE 111222-D",
        },
    )
    token_analista_b = create_access_token(
        "analista.b@gmail.com",
        "ANALISTA",
        extra_claims={
            "nome": "Dr. Bruno Outro",
            "email": "analista.b@gmail.com",
            "crea": "CREA-PE 333444-D",
            "escopoAnalistaId": "analista.b@gmail.com",
            "responsavelNome": "Dr. Bruno Outro",
            "responsavelCrea": "CREA-PE 333444-D",
        },
    )

    # 1. Analista A cria amostra
    res_criar = client.post(
        "/api/laudos",
        json={
            "protocolo": "LAB-EQUIPE-A-01",
            "cpf_cliente": "52998224725",
            "cliente_nome": "Fazenda Santa Fé",
            "propriedade": "Lote 10",
            "dataRecebimento": "2026-11-16",
            "tipoAnalise": "fisico_quimica",
        },
        headers={"Authorization": f"Bearer {token_analista_a}"},
    )
    assert res_criar.status_code == 201
    assert res_criar.json()["dados"]["analistaNome"] == "Dra. Ana Solos"
    assert res_criar.json()["dados"]["analistaCrea"] == "CREA-PE 111222-D"

    # 2. Auxiliar A1 lista laudos e encontra o laudo da Equipe A
    res_lista_aux = client.get(
        "/api/laudos",
        headers={"Authorization": f"Bearer {token_auxiliar_a1}"},
    )
    assert res_lista_aux.status_code == 200
    protocolos_equipe_a = [item["protocolo"] for item in res_lista_aux.json()["dados"]]
    assert "LAB-EQUIPE-A-01" in protocolos_equipe_a

    # 3. Auxiliar A1 lê e edita (Read/Write) o rascunho do laudo da Equipe A
    res_get_aux = client.get(
        "/api/laudos/LAB-EQUIPE-A-01/analise",
        headers={"Authorization": f"Bearer {token_auxiliar_a1}"},
    )
    assert res_get_aux.status_code == 200
    amostra_meta = res_get_aux.json()["dados"]["amostra"]
    assert amostra_meta["responsavelNome"] == "Dra. Ana Solos"
    assert amostra_meta["responsavelCrea"] == "CREA-PE 111222-D"
    versao_inicial = res_get_aux.json()["dados"]["versao"]

    res_patch_aux = client.patch(
        "/api/laudos/LAB-EQUIPE-A-01/analise/rascunho",
        json={"versaoEsperada": versao_inicial, "quimica": {"ph": 6.1}},
        headers={"Authorization": f"Bearer {token_auxiliar_a1}"},
    )
    assert res_patch_aux.status_code == 200
    assert res_patch_aux.json()["dados"]["novaVersao"] == versao_inicial + 1

    # 4. Concorrência otimista: se o Analista A (ou outro dispositivo tablet/notebook) tentar salvar com a versão antiga, recebe 409 Conflict
    res_conflito = client.patch(
        "/api/laudos/LAB-EQUIPE-A-01/analise/rascunho",
        json={"versaoEsperada": versao_inicial, "quimica": {"ph": 5.9}},
        headers={"Authorization": f"Bearer {token_analista_a}"},
    )
    assert res_conflito.status_code == 409

    # 5. Isolamento: Analista B não vê o laudo na listagem e recebe 403 ao tentar acessar ou editar
    res_lista_b = client.get(
        "/api/laudos",
        headers={"Authorization": f"Bearer {token_analista_b}"},
    )
    assert res_lista_b.status_code == 200
    protocolos_b = [item["protocolo"] for item in res_lista_b.json()["dados"]]
    assert "LAB-EQUIPE-A-01" not in protocolos_b

    res_get_b = client.get(
        "/api/laudos/LAB-EQUIPE-A-01/analise",
        headers={"Authorization": f"Bearer {token_analista_b}"},
    )
    assert res_get_b.status_code == 403

    res_patch_b = client.patch(
        "/api/laudos/LAB-EQUIPE-A-01/analise/rascunho",
        json={"versaoEsperada": versao_inicial + 1, "quimica": {"ph": 7.0}},
        headers={"Authorization": f"Bearer {token_analista_b}"},
    )
    assert res_patch_b.status_code == 403


def test_homologar_laudo_fluxo_completo_e_pdf_sob_demanda(client):
    """
    Valida o ciclo completo até produção:
    1. Auxiliar não pode homologar (403 Forbidden).
    2. Laudo ainda não processado (EM_ANALISE) não pode ser homologado (422) e PDF retorna 409.
    3. Consulta do cliente antes da homologação mostra andamento, mas sem PDF nem indicadores finais.
    4. Após processar e homologar pelo Analista Principal, status vira CONCLUIDO,
       situação do cliente libera indicadores e download gera o PDF (%PDF) sob demanda em memória.
    """
    protocolo = "LAB-HOMOLOG-2026"
    cpf_cliente = "52998224725"

    token_analista = create_access_token(
        "analista.homolog@gmail.com",
        "ANALISTA",
        extra_claims={
            "nome": "Dr. Marcos Responsável",
            "email": "analista.homolog@gmail.com",
            "crea": "CREA-PE 555666-D",
            "escopoAnalistaId": "analista.homolog@gmail.com",
            "responsavelNome": "Dr. Marcos Responsável",
            "responsavelCrea": "CREA-PE 555666-D",
        },
    )
    token_auxiliar = create_access_token(
        "aux.homolog@gmail.com",
        "AUXILIAR",
        extra_claims={
            "nome": "Auxiliar Bancada",
            "email": "aux.homolog@gmail.com",
            "escopoAnalistaId": "analista.homolog@gmail.com",
            "responsavelNome": "Dr. Marcos Responsável",
            "responsavelCrea": "CREA-PE 555666-D",
        },
    )

    # 1. Criar amostra
    res_criar = client.post(
        "/api/laudos",
        json={
            "protocolo": protocolo,
            "cpf_cliente": cpf_cliente,
            "cliente_nome": "Produtor Rural Teste",
            "propriedade": "Fazenda Esperança",
            "localizacao": "Belo Jardim - PE",
            "dataRecebimento": "2026-11-20",
            "tipoAnalise": "fisico_quimica",
            "culturaExistente": "Milho",
        },
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_criar.status_code == 201
    versao = res_criar.json()["dados"]["versao"]

    # 2. Cliente já consegue consultar o andamento enquanto EM_ANALISE, mas sem PDF liberado
    res_cliente_andamento = client.post(
        "/api/auth/cliente",
        json={"protocolo": protocolo, "cpf": cpf_cliente},
    )
    assert res_cliente_andamento.status_code == 200
    token_cliente = res_cliente_andamento.json()["token"]
    laudo_andamento = res_cliente_andamento.json()["laudo"]
    assert laudo_andamento["status"] == "EM_ANALISE"
    assert laudo_andamento["temPdfDisponivel"] is False
    assert laudo_andamento["dataEmissao"] is None

    # PDF antes da homologação -> 409 Conflict (PDF_NAO_GERADO)
    res_pdf_antes = client.get(
        f"/api/laudos/{protocolo}/pdf",
        headers={"Authorization": f"Bearer {token_cliente}"},
    )
    assert res_pdf_antes.status_code == 409
    assert res_pdf_antes.json()["detail"]["codigoErro"] == "PDF_NAO_GERADO"

    # 3. Tentar homologar antes de processar -> 422
    res_homolog_antes = client.post(
        f"/api/laudos/{protocolo}/homologar",
        json={"versaoEsperada": versao},
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_homolog_antes.status_code == 422

    # 4. Processar cálculos
    res_proc = client.post(
        f"/api/laudos/{protocolo}/analise/processar",
        json={
            "versaoEsperada": versao,
            "quimica": {
                "ph": 6.1,
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
            },
        },
        headers={"Authorization": f"Bearer {token_auxiliar}"},
    )
    assert res_proc.status_code == 200
    versao_pos_proc = res_proc.json()["dados"]["novaVersao"]

    # 5. Auxiliar tentando homologar -> 403 Forbidden
    res_homolog_aux = client.post(
        f"/api/laudos/{protocolo}/homologar",
        json={"versaoEsperada": versao_pos_proc},
        headers={"Authorization": f"Bearer {token_auxiliar}"},
    )
    assert res_homolog_aux.status_code == 403

    # 6. Analista Principal homologa com sucesso -> 200 OK
    res_homolog = client.post(
        f"/api/laudos/{protocolo}/homologar",
        json={"versaoEsperada": versao_pos_proc},
        headers={"Authorization": f"Bearer {token_analista}"},
    )
    assert res_homolog.status_code == 200
    dados_homolog = res_homolog.json()["dados"]
    assert dados_homolog["status"] == "CONCLUIDO"
    assert dados_homolog["temPdfDisponivel"] is True
    assert dados_homolog["responsavelNome"] == "Dr. Marcos Responsável"
    assert dados_homolog["responsavelCrea"] == "CREA-PE 555666-D"

    # 7. Cliente consulta situação atualizada (GET /api/laudos/{protocolo}) e baixa o PDF gerado sob demanda
    res_situacao = client.get(
        f"/api/laudos/{protocolo}",
        headers={"Authorization": f"Bearer {token_cliente}"},
    )
    assert res_situacao.status_code == 200
    laudo_concluido = res_situacao.json()["laudo"]
    assert laudo_concluido["status"] == "CONCLUIDO"
    assert laudo_concluido["temPdfDisponivel"] is True
    assert laudo_concluido["dataEmissao"] is not None
    assert laudo_concluido["parametrosSolo"]["ph"] == 6.1

    res_pdf = client.get(
        f"/api/laudos/{protocolo}/pdf",
        headers={"Authorization": f"Bearer {token_cliente}"},
    )
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF-")
