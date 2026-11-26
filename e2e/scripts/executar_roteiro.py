#!/usr/bin/env python3
"""Executa o roteiro E2E do ciclo de um laudo contra uma API em execução e
grava o registro da execução (Markdown + JSON).

Uso:
    python e2e/scripts/executar_roteiro.py --base-url http://localhost:8000/api
    python e2e/scripts/executar_roteiro.py --storage-dir apps/backend/storage   # inclui o passo do PDF

Requisitos: Python 3.10+ e `httpx` (já em apps/backend/requirements.txt).
A API deve estar em ENVIRONMENT=dev com ENABLE_MOCK_AUTH=true (login do analista de teste).
Código de saída: 0 se todos os passos passaram, 1 caso contrário.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import httpx

RAIZ = Path(__file__).resolve().parents[1]
PASTA_REGISTROS = RAIZ / "roteiro-exemplo" / "registros"

CPF_TESTE = "52998224725"  # CPF válido usado nos dados de teste
PROTOCOLO_CLIENTE_BASE_MOCK = "20101.2306"  # protocolo existente na base de consulta do cliente

PDF_MINIMO = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n%%EOF\n"
)


@dataclass
class Passo:
    numero: int
    titulo: str
    requisicao: str
    esperado: str
    obtido: str = ""
    status_http: int | None = None
    duracao_ms: int = 0
    resultado: str = "NAO_EXECUTADO"  # PASSOU | FALHOU | PULADO
    evidencia: dict = field(default_factory=dict)


class Execucao:
    def __init__(self, base_url: str, storage_dir: Path | None):
        self.base_url = base_url.rstrip("/")
        self.storage_dir = storage_dir
        self.cliente = httpx.Client(base_url=self.base_url, timeout=20.0)
        self.passos: list[Passo] = []
        self.contexto: dict = {}

    def passo(self, titulo: str, requisicao: str, esperado: str) -> Passo:
        p = Passo(len(self.passos) + 1, titulo, requisicao, esperado)
        self.passos.append(p)
        return p

    def chamar(self, p: Passo, metodo: str, caminho: str, **kw) -> httpx.Response:
        inicio = time.perf_counter()
        resp = self.cliente.request(metodo, caminho, **kw)
        p.duracao_ms = round((time.perf_counter() - inicio) * 1000)
        p.status_http = resp.status_code
        return resp

    @staticmethod
    def fechar(p: Passo, ok: bool, obtido: str, **evidencia) -> None:
        p.resultado = "PASSOU" if ok else "FALHOU"
        p.obtido = obtido
        p.evidencia = evidencia


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def json_seguro(resp: httpx.Response) -> dict:
    try:
        return resp.json()
    except ValueError:
        return {}


def detalhe(resp: httpx.Response) -> str:
    corpo = json_seguro(resp)
    d = corpo.get("detail", corpo)
    return d.get("mensagem", str(d)) if isinstance(d, dict) else str(d)


def rodar(ex: Execucao) -> None:
    protocolo = "E2E-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    ex.contexto["protocolo_analise"] = protocolo

    # 1 ---------------------------------------------------------------------
    p = ex.passo("API saudável", "GET /health", "200 e status ok")
    r = ex.chamar(p, "GET", "/health")
    ex.fechar(p, r.status_code == 200 and json_seguro(r).get("status") == "ok", f"{r.status_code} {r.text.strip()}")

    # 2 ---------------------------------------------------------------------
    p = ex.passo(
        "Analista entra no sistema",
        "POST /auth/google {idToken: mock-dev-token}",
        "200, token Bearer e role ANALISTA",
    )
    r = ex.chamar(p, "POST", "/auth/google", json={"idToken": "mock-dev-token"})
    corpo = json_seguro(r)
    ok = r.status_code == 200 and corpo.get("usuario", {}).get("role") == "ANALISTA"
    token_analista = corpo.get("token", "")
    ex.fechar(p, ok, f"{r.status_code}, usuário {corpo.get('usuario', {}).get('email', '?')}")
    if not ok:
        return

    # 3 ---------------------------------------------------------------------
    p = ex.passo(
        "Analista cadastra a amostra",
        f"POST /laudos (protocolo {protocolo})",
        "201, status EM_ANALISE, versão 1",
    )
    r = ex.chamar(
        p,
        "POST",
        "/laudos",
        headers=auth(token_analista),
        json={
            "protocolo": protocolo,
            "cpf_cliente": CPF_TESTE,
            "cliente_nome": "José Teste da Silva",
            "propriedade": "Sítio Boa Esperança",
            "localizacao": "Belo Jardim - PE",
            "profundidadeColeta": "0-20 cm",
            "cultivo": "Milho",
            "dataRecebimento": datetime.now().date().isoformat(),
            "tipoAnalise": "fisico_quimica",
            "culturaExistente": "Pastagem",
            "email": "jose.teste@exemplo.com",
            "telefone": "81999998888",
        },
    )
    d = json_seguro(r).get("dados", {})
    ok = r.status_code == 201 and d.get("status") == "EM_ANALISE" and d.get("versao") == 1
    ex.fechar(p, ok, f"{r.status_code}, status {d.get('status')}, versão {d.get('versao')}")
    if not ok:
        return

    # 4 ---------------------------------------------------------------------
    p = ex.passo(
        "Protocolo duplicado é recusado",
        "POST /laudos (mesmo protocolo)",
        "409",
    )
    r = ex.chamar(
        p,
        "POST",
        "/laudos",
        headers=auth(token_analista),
        json={
            "protocolo": protocolo,
            "cpf_cliente": CPF_TESTE,
            "cliente_nome": "Outro Nome",
            "propriedade": "Outra Propriedade",
        },
    )
    ex.fechar(p, r.status_code == 409, f"{r.status_code}: {detalhe(r)}")

    # 5 ---------------------------------------------------------------------
    p = ex.passo(
        "Analista abre a análise da amostra",
        f"GET /laudos/{protocolo}/analise",
        "200 com solicitante, propriedade e versão 1",
    )
    r = ex.chamar(p, "GET", f"/laudos/{protocolo}/analise", headers=auth(token_analista))
    d = json_seguro(r).get("dados", {})
    ok = r.status_code == 200 and d.get("amostra", {}).get("solicitante") == "José Teste da Silva"
    versao = d.get("versao", 0)
    ex.fechar(p, ok, f"{r.status_code}, status {d.get('status')}, versão {versao}")

    # 6 ---------------------------------------------------------------------
    p = ex.passo(
        "Auto-save: rascunho com dados de química",
        f"PATCH /laudos/{protocolo}/analise/rascunho (versaoEsperada={versao})",
        "200 e versão incrementada",
    )
    r = ex.chamar(
        p,
        "PATCH",
        f"/laudos/{protocolo}/analise/rascunho",
        headers=auth(token_analista),
        json={"versaoEsperada": versao, "quimica": {"ph": 5.4, "sodioMgL": 12.0, "potassioMgL": 45.0}},
    )
    d = json_seguro(r).get("dados", {})
    nova = d.get("novaVersao", 0)
    ex.fechar(p, r.status_code == 200 and nova == versao + 1, f"{r.status_code}, nova versão {nova}")
    versao_antiga, versao = versao, nova

    # 7 ---------------------------------------------------------------------
    p = ex.passo(
        "Concorrência otimista: salvar com versão desatualizada",
        f"PATCH rascunho (versaoEsperada={versao_antiga}, já superada)",
        "409",
    )
    r = ex.chamar(
        p,
        "PATCH",
        f"/laudos/{protocolo}/analise/rascunho",
        headers=auth(token_analista),
        json={"versaoEsperada": versao_antiga, "quimica": {"ph": 9.9}},
    )
    ex.fechar(p, r.status_code == 409, f"{r.status_code}: {detalhe(r)}")

    # 8 ---------------------------------------------------------------------
    p = ex.passo(
        "Processar sem calibração e sem TFSA é bloqueado",
        f"POST /laudos/{protocolo}/analise/processar (payload incompleto)",
        "422",
    )
    r = ex.chamar(
        p,
        "POST",
        f"/laudos/{protocolo}/analise/processar",
        headers=auth(token_analista),
        json={"versaoEsperada": versao, "quimica": {"ph": 5.4}},
    )
    ex.fechar(p, r.status_code == 422, f"{r.status_code}")

    # 9 ---------------------------------------------------------------------
    payload = {
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
    p = ex.passo(
        "Analista processa os cálculos oficiais",
        f"POST /laudos/{protocolo}/analise/processar (dados completos)",
        "200 e status AGUARDANDO_HOMOLOGACAO",
    )
    r = ex.chamar(p, "POST", f"/laudos/{protocolo}/analise/processar", headers=auth(token_analista), json=payload)
    d = json_seguro(r).get("dados", {})
    ok = r.status_code == 200 and d.get("status") == "AGUARDANDO_HOMOLOGACAO"
    calculos = d.get("calculosOficiais", {})
    ex.fechar(
        p,
        ok,
        f"{r.status_code}, status {d.get('status')}, versão {d.get('novaVersao')}",
        complexoSortivo=calculos.get("complexoSortivo"),
        conversoes=calculos.get("conversoes"),
        granulometria=calculos.get("granulometria"),
    )

    # 10 --------------------------------------------------------------------
    p = ex.passo(
        "Resultado persistido: reabrir a análise",
        f"GET /laudos/{protocolo}/analise",
        "status AGUARDANDO_HOMOLOGACAO e pH 5.4 gravado",
    )
    r = ex.chamar(p, "GET", f"/laudos/{protocolo}/analise", headers=auth(token_analista))
    d = json_seguro(r).get("dados", {})
    ph = d.get("dadosBancada", {}).get("quimica", {}).get("ph")
    ex.fechar(p, r.status_code == 200 and d.get("status") == "AGUARDANDO_HOMOLOGACAO" and ph == 5.4, f"{r.status_code}, status {d.get('status')}, pH {ph}")

    # 11 --------------------------------------------------------------------
    p = ex.passo(
        "Homologação pelo servidor",
        f"POST /laudos/{protocolo}/homologar",
        "200 e status CONCLUIDO (endpoint ainda não existe no backend)",
    )
    r = ex.chamar(p, "POST", f"/laudos/{protocolo}/homologar", headers=auth(token_analista), json={"versaoEsperada": versao + 1})
    if r.status_code in (404, 405):
        p.resultado, p.obtido = "PULADO", f"{r.status_code}: endpoint não implementado (lacuna conhecida, ver ESTRATEGIA.md §7)"
    else:
        ex.fechar(p, r.status_code == 200, f"{r.status_code}")

    # 12 --------------------------------------------------------------------
    p = ex.passo(
        "Cliente não acessa a bancada (RBAC)",
        f"GET /laudos/{protocolo}/analise com token de cliente",
        "403",
    )
    rc = ex.cliente.post("/auth/cliente", json={"protocolo": PROTOCOLO_CLIENTE_BASE_MOCK, "cpf": CPF_TESTE})
    token_cliente = json_seguro(rc).get("token", "")
    r = ex.chamar(p, "GET", f"/laudos/{protocolo}/analise", headers=auth(token_cliente))
    ex.fechar(p, r.status_code == 403, f"{r.status_code}: {detalhe(r)}")

    # 13 --------------------------------------------------------------------
    p = ex.passo(
        "Cliente consulta com protocolo e CPF corretos",
        f"POST /auth/cliente (protocolo {PROTOCOLO_CLIENTE_BASE_MOCK})",
        "200, laudo com CPF mascarado",
    )
    r = ex.chamar(p, "POST", "/auth/cliente", json={"protocolo": PROTOCOLO_CLIENTE_BASE_MOCK, "cpf": CPF_TESTE})
    corpo = json_seguro(r)
    mascarado = corpo.get("laudo", {}).get("cliente", {}).get("cpfMascarado", "")
    ok = r.status_code == 200 and CPF_TESTE not in r.text and mascarado.startswith("***")
    ex.fechar(p, ok, f"{r.status_code}, CPF exibido como {mascarado}, status do laudo {corpo.get('laudo', {}).get('status')}")

    # 14 --------------------------------------------------------------------
    p = ex.passo(
        "Cliente com CPF errado recebe resposta neutra",
        "POST /auth/cliente (CPF válido, mas de outra pessoa)",
        "401 sem indicar qual campo falhou",
    )
    r = ex.chamar(p, "POST", "/auth/cliente", json={"protocolo": PROTOCOLO_CLIENTE_BASE_MOCK, "cpf": "11144477735"})
    ok = r.status_code == 401 and "CPF" not in detalhe(r)
    ex.fechar(p, ok, f"{r.status_code}: {detalhe(r)}")

    # 15 --------------------------------------------------------------------
    p = ex.passo(
        "Amostra recém-cadastrada na consulta do cliente",
        f"POST /auth/cliente (protocolo {protocolo})",
        "200 quando a consulta do cliente ler o banco; hoje usa base em memória",
    )
    r = ex.chamar(p, "POST", "/auth/cliente", json={"protocolo": protocolo.upper(), "cpf": CPF_TESTE})
    if r.status_code == 200:
        ex.fechar(p, True, "200: consulta lê o banco")
    else:
        p.resultado = "PULADO"
        p.obtido = f"{r.status_code}: consulta do cliente ainda usa BASE_LAUDOS_MOCK (lacuna conhecida, ver ESTRATEGIA.md §7)"

    # 16 --------------------------------------------------------------------
    p = ex.passo(
        "Download do PDF pelo cliente",
        f"GET /laudos/{PROTOCOLO_CLIENTE_BASE_MOCK}/pdf",
        "200 application/pdf (exige --storage-dir para criar o PDF de teste)",
    )
    if ex.storage_dir is None:
        p.resultado, p.obtido = "PULADO", "execute com --storage-dir para criar o PDF de teste"
    else:
        ex.storage_dir.mkdir(parents=True, exist_ok=True)
        alvo = ex.storage_dir / f"{PROTOCOLO_CLIENTE_BASE_MOCK}.pdf"
        existia = alvo.exists()
        if not existia:
            alvo.write_bytes(PDF_MINIMO)
        try:
            r = ex.chamar(p, "GET", f"/laudos/{PROTOCOLO_CLIENTE_BASE_MOCK}/pdf", headers=auth(token_cliente))
            ok = r.status_code == 200 and r.headers.get("content-type") == "application/pdf" and r.content.startswith(b"%PDF")
            ex.fechar(p, ok, f"{r.status_code}, {r.headers.get('content-type')}, {len(r.content)} bytes")
        finally:
            if not existia:
                alvo.unlink(missing_ok=True)

    # 17 --------------------------------------------------------------------
    p = ex.passo(
        "Cliente não baixa PDF de outro protocolo (BOLA)",
        "GET /laudos/2026-SOLO-00123/pdf com token do protocolo 20101.2306",
        "403",
    )
    r = ex.chamar(p, "GET", "/laudos/2026-SOLO-00123/pdf", headers=auth(token_cliente))
    ex.fechar(p, r.status_code == 403, f"{r.status_code}: {detalhe(r)}")

    # 18 --------------------------------------------------------------------
    p = ex.passo(
        "Path traversal no download é barrado",
        "GET /laudos/..%2F..%2Fetc%2Fpasswd/pdf",
        "400, 403 ou 404, nunca 200",
    )
    r = ex.chamar(p, "GET", "/laudos/..%2F..%2Fetc%2Fpasswd/pdf", headers=auth(token_cliente))
    ex.fechar(p, r.status_code in (400, 403, 404), f"{r.status_code}")


def gerar_markdown(ex: Execucao, inicio: datetime, fim: datetime) -> str:
    resumo = {k: sum(1 for p in ex.passos if p.resultado == k) for k in ("PASSOU", "FALHOU", "PULADO")}
    icone = {"PASSOU": "✅", "FALHOU": "❌", "PULADO": "⏭️", "NAO_EXECUTADO": "⏸️"}
    linhas = [
        "# Registro de execução do roteiro E2E",
        "",
        f"- **Início:** {inicio.isoformat(timespec='seconds')}",
        f"- **Duração:** {(fim - inicio).total_seconds():.1f} s",
        f"- **API:** `{ex.base_url}`",
        f"- **Protocolo da análise:** `{ex.contexto.get('protocolo_analise', '-')}`",
        f"- **Resultado:** {resumo['PASSOU']} passaram, {resumo['FALHOU']} falharam, {resumo['PULADO']} pulados",
        "",
        "| # | Passo | Esperado | Obtido | HTTP | ms | Resultado |",
        "|--:|-------|----------|--------|-----:|---:|:---------:|",
    ]
    for p in ex.passos:
        linhas.append(
            f"| {p.numero} | {p.titulo} | {p.esperado} | {p.obtido.replace('|', '/')} | "
            f"{p.status_http or '-'} | {p.duracao_ms} | {icone[p.resultado]} {p.resultado} |"
        )
    calculos = next((p.evidencia for p in ex.passos if p.evidencia.get("complexoSortivo")), None)
    if calculos:
        linhas += [
            "",
            "## Evidência: cálculos oficiais devolvidos pelo servidor",
            "",
            "```json",
            json.dumps(calculos, ensure_ascii=False, indent=2),
            "```",
        ]
    linhas += ["", "## Detalhe dos passos", ""]
    for p in ex.passos:
        linhas += [f"### {p.numero}. {p.titulo}", f"- Requisição: `{p.requisicao}`", f"- Esperado: {p.esperado}", f"- Obtido: {p.obtido}", ""]
    return "\n".join(linhas) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", default="http://localhost:8000/api")
    ap.add_argument("--storage-dir", type=Path, help="pasta de PDFs da API (cria um PDF de teste temporário)")
    ap.add_argument("--saida", type=Path, default=PASTA_REGISTROS)
    args = ap.parse_args()

    ex = Execucao(args.base_url, args.storage_dir)
    inicio = datetime.now(timezone.utc).astimezone()
    try:
        rodar(ex)
    except httpx.HTTPError as erro:
        print(f"Falha de rede: {erro}", file=sys.stderr)
        return 2
    fim = datetime.now(timezone.utc).astimezone()

    args.saida.mkdir(parents=True, exist_ok=True)
    selo = inicio.strftime("%Y%m%d-%H%M%S")
    md = gerar_markdown(ex, inicio, fim)
    (args.saida / f"execucao-{selo}.md").write_text(md, encoding="utf-8")
    (args.saida / f"execucao-{selo}.json").write_text(
        json.dumps({"inicio": inicio.isoformat(), "fim": fim.isoformat(), "base_url": ex.base_url, "passos": [asdict(p) for p in ex.passos]}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(re.sub(r"\n{2,}", "\n", md.split("## Evidência")[0].split("## Detalhe")[0]))
    return 1 if any(p.resultado == "FALHOU" for p in ex.passos) else 0


if __name__ == "__main__":
    sys.exit(main())
