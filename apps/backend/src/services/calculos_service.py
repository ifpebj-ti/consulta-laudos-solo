"""
Motor matemático agronômico idêntico ao LSSA/IFPE e calculos.ts.
Executa cálculos agronômicos oficiais de bancada:
- Líquidos com Branco
- Conversão de Sódio e Potássio para cmolc/dm³
- Complexo Sortivo (Soma de Bases, CTC efetiva, CTC potencial, V%, m%, relações)
- Granulometria (Frações Areia, Argila, Silte)
- Classificação Textural (13 classes)
- Curva de Calibração e Concentração de Fósforo
"""

from typing import Any


def calcular_regressao_linear(pontos: list[dict[str, float]]) -> dict[str, float]:
    """Regressão linear por mínimos quadrados: y = a·x + b."""
    n = len(pontos)
    if n == 0:
        return {"a": 0.0, "b": 0.0, "r2": 0.0}

    soma_x = sum(p["x"] for p in pontos)
    soma_y = sum(p["y"] for p in pontos)
    soma_xy = sum(p["x"] * p["y"] for p in pontos)
    soma_x2 = sum(p["x"] ** 2 for p in pontos)

    denominador = n * soma_x2 - soma_x * soma_x
    a = (n * soma_xy - soma_x * soma_y) / denominador if denominador != 0 else 0.0
    b = (soma_y - a * soma_x) / n if n > 0 else 0.0

    media_y = soma_y / n
    ss_res = sum((p["y"] - (a * p["x"] + b)) ** 2 for p in pontos)
    ss_tot = sum((p["y"] - media_y) ** 2 for p in pontos)
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot != 0 else 1.0

    return {"a": a, "b": b, "r2": r2}


def calcular_concentracao_fosforo(
    leitura_amostra: float,
    coef: dict[str, float],
    fator_diluicao: float = 1.0,
) -> dict[str, float] | None:
    """A partir da leitura de absorbância da amostra (y) e da reta de calibração, obtém a concentração de Fósforo."""
    a = coef.get("a", 0.0)
    b = coef.get("b", 0.0)
    if a == 0:
        return None

    x_bruto = (leitura_amostra - b) / a
    curva = x_bruto * 10.0  # multiplicação padrão por 10
    fosforo = curva * fator_diluicao
    return {"curva": curva, "fosforo": fosforo}


def calcular_valor_liquido(medido: float, branco: float = 0.0) -> float:
    """Calcula o valor líquido subtraindo a leitura do branco."""
    return medido - branco


def converter_na_para_cmolc(mg_por_litro: float) -> float:
    """
    Conversão de Na+ de mg/L para cmolc/dm³ de solo.
    Fator = peso equivalente (23) * 10 = 230.
    """
    return mg_por_litro / 230.0


def converter_k_para_cmolc(mg_por_litro: float) -> float:
    """
    Conversão de K+ de mg/L para cmolc/dm³ de solo.
    Fator = peso equivalente (39.1) * 10 = 391.
    """
    return mg_por_litro / 391.0


def calcular_complexo_sortivo(
    ca: float,
    mg: float,
    al: float,
    h_al: float,
    na_cmolc: float,
    k_cmolc: float,
) -> dict[str, Any]:
    """
    Soma de Bases, CTC efetiva/potencial, saturações e relações catiônicas:
    SB = Ca + Mg + Na + K
    T = SB + (H+Al)
    t = SB + Al
    V% = SB / T * 100
    m% = Al / t * 100
    """
    soma_bases = ca + mg + na_cmolc + k_cmolc
    ctc_potencial = soma_bases + h_al
    ctc_efetiva = soma_bases + al

    saturacao_bases = (
        (soma_bases / ctc_potencial * 100.0) if ctc_potencial != 0 else 0.0
    )
    saturacao_aluminio = (al / ctc_efetiva * 100.0) if ctc_efetiva != 0 else 0.0

    relacao_ca_mg = (ca / mg) if mg != 0 else None
    relacao_ca_k = (ca / k_cmolc) if k_cmolc != 0 else None
    relacao_mg_k = (mg / k_cmolc) if k_cmolc != 0 else None

    ca_sobre_t = (ca / ctc_potencial * 100.0) if ctc_potencial != 0 else 0.0
    mg_sobre_t = (mg / ctc_potencial * 100.0) if ctc_potencial != 0 else 0.0
    h_al_sobre_t = (h_al / ctc_potencial * 100.0) if ctc_potencial != 0 else 0.0

    return {
        "somaBases": soma_bases,
        "ctcEfetiva": ctc_efetiva,
        "ctcPotencial": ctc_potencial,
        "saturacaoBases": saturacao_bases,
        "saturacaoAluminio": saturacao_aluminio,
        "relacaoCaMg": relacao_ca_mg,
        "relacaoCaK": relacao_ca_k,
        "relacaoMgK": relacao_mg_k,
        "caSobreT": ca_sobre_t,
        "mgSobreT": mg_sobre_t,
        "hAlSobreT": h_al_sobre_t,
    }


def calcular_granulometria(
    tfsa: float,
    areia_becker: float,
    areia_becker_vazio: float,
    argila_becker: float,
    argila_becker_vazio: float,
    naoh_becker: float,
    naoh_becker_vazio: float,
) -> dict[str, Any]:
    """
    Cálculo das frações Areia/Silte/Argila:
    - Peso areia = (areia + becker) - becker
    - Peso seco NaOH = (NaOH + becker) - becker
    - Argila 10ml (corrigida) = (argila + becker - becker) - peso seco NaOH
    - Argila 1000ml = Argila 10ml * 100
    - % Areia = peso areia / TFSA * 100
    - % Argila = argila 1000ml / TFSA * 100
    - % Silte = 100 - % Areia - % Argila
    """
    peso_areia = areia_becker - areia_becker_vazio
    peso_seco_naoh = naoh_becker - naoh_becker_vazio
    argila_10ml_bruto = argila_becker - argila_becker_vazio
    argila_10ml_corrigido = argila_10ml_bruto - peso_seco_naoh
    argila_1000ml = argila_10ml_corrigido * 100.0

    if tfsa <= 0:
        return {
            "pesoAreia": peso_areia,
            "pesoSecoNaoh": peso_seco_naoh,
            "argila10mlCorrigido": argila_10ml_corrigido,
            "argila1000ml": argila_1000ml,
            "pctAreia": None,
            "pctSilte": None,
            "pctArgila": None,
        }

    pct_areia = (peso_areia / tfsa) * 100.0
    pct_argila = (argila_1000ml / tfsa) * 100.0
    pct_silte = 100.0 - pct_areia - pct_argila

    return {
        "pesoAreia": peso_areia,
        "pesoSecoNaoh": peso_seco_naoh,
        "argila10mlCorrigido": argila_10ml_corrigido,
        "argila1000ml": argila_1000ml,
        "pctAreia": pct_areia,
        "pctSilte": pct_silte,
        "pctArgila": pct_argila,
    }


def classificar_textura(pct_areia: float, pct_silte: float, pct_argila: float) -> str:
    """
    Classificação triangular de 13 classes idêntica ao referenciado na planilha do LSSA/IFPE.
    """
    areia = pct_areia
    silte = pct_silte
    argila = pct_argila

    if areia >= 85 and silte <= 15 and argila <= 10:
        return "Areia"
    if areia >= 70 and areia < 90 and silte <= 30 and argila <= 15:
        return "Areia Franca"
    if areia >= 45 and areia < 85 and silte <= 50 and argila <= 20:
        return "Franco Arenoso"
    if areia >= 45 and areia < 80 and silte <= 28 and argila >= 20 and argila <= 35:
        return "Franco Argilo Arenoso"
    if areia >= 45 and areia < 65 and silte <= 20 and argila >= 35 and argila <= 55:
        return "Argilo Arenoso"
    if (
        areia >= 23
        and areia < 55
        and silte >= 28
        and silte <= 50
        and argila >= 5
        and argila <= 28
    ):
        return "Franco"
    if areia < 50 and silte >= 50 and silte <= 90 and argila <= 28:
        return "Franco Siltoso"
    if areia < 20 and silte >= 80 and argila <= 10:
        return "Silte"
    if (
        areia >= 20
        and areia < 45
        and silte >= 15
        and silte <= 53
        and argila >= 28
        and argila <= 40
    ):
        return "Franco Argiloso"
    if areia < 20 and silte >= 40 and silte <= 73 and argila >= 28 and argila <= 40:
        return "Franco Argilo Siltoso"
    if areia < 45 and silte <= 40 and argila >= 40 and argila <= 60:
        return "Argila"
    if areia < 20 and silte >= 40 and silte <= 60 and argila >= 40 and argila <= 60:
        return "Argilo Siltoso"
    if areia < 40 and silte <= 40 and argila >= 60:
        return "Muito Argiloso"

    return "Franco"
