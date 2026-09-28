import pytest

from src.services.calculos_service import (
    calcular_complexo_sortivo,
    calcular_concentracao_fosforo,
    calcular_granulometria,
    calcular_regressao_linear,
    calcular_valor_liquido,
    classificar_textura,
    converter_k_para_cmolc,
    converter_na_para_cmolc,
)


def test_regressao_linear_pontos_padrao():
    pontos = [
        {"x": 0.0, "y": 0.02},
        {"x": 5.0, "y": 0.18},
        {"x": 10.0, "y": 0.35},
        {"x": 15.0, "y": 0.52},
        {"x": 20.0, "y": 0.68},
    ]
    resultado = calcular_regressao_linear(pontos)
    assert resultado["a"] == pytest.approx(0.0332, abs=1e-4)
    assert resultado["b"] == pytest.approx(0.018, abs=1e-3)
    assert resultado["r2"] > 0.999


def test_regressao_linear_vazia():
    resultado = calcular_regressao_linear([])
    assert resultado["a"] == 0.0
    assert resultado["b"] == 0.0
    assert resultado["r2"] == 0.0


def test_concentracao_fosforo():
    coef = {"a": 0.033, "b": 0.019, "r2": 0.9998}
    leitura = 0.612
    res = calcular_concentracao_fosforo(leitura, coef, fator_diluicao=1.0)
    assert res is not None
    assert res["curva"] == pytest.approx(179.6969, rel=1e-3)
    assert res["fosforo"] == pytest.approx(179.6969, rel=1e-3)

    # Coeficiente a = 0 deve retornar None
    res_zero = calcular_concentracao_fosforo(leitura, {"a": 0.0, "b": 0.0, "r2": 0.0})
    assert res_zero is None


def test_valores_liquidos_e_conversoes():
    assert calcular_valor_liquido(2.1, 0.0) == 2.1
    assert calcular_valor_liquido(2.5, 0.4) == 2.1

    na_cmolc = converter_na_para_cmolc(12.0)
    k_cmolc = converter_k_para_cmolc(45.0)

    assert na_cmolc == pytest.approx(0.0521739, rel=1e-4)
    assert k_cmolc == pytest.approx(0.1150895, rel=1e-4)


def test_complexo_sortivo_caso_spec():
    ca = 2.1
    mg = 0.85
    al = 0.3
    h_al = 3.2
    na_cmolc = converter_na_para_cmolc(12.0)
    k_cmolc = converter_k_para_cmolc(45.0)

    res = calcular_complexo_sortivo(ca, mg, al, h_al, na_cmolc, k_cmolc)

    assert res["somaBases"] == pytest.approx(3.1173, abs=1e-3)
    assert res["ctcEfetiva"] == pytest.approx(3.4173, abs=1e-3)
    assert res["ctcPotencial"] == pytest.approx(6.3173, abs=1e-3)
    assert res["saturacaoBases"] == pytest.approx(49.35, abs=1e-2)
    assert res["saturacaoAluminio"] == pytest.approx(8.78, abs=1e-2)
    assert res["relacaoCaMg"] == pytest.approx(2.47, abs=1e-2)
    assert res["relacaoCaK"] == pytest.approx(18.25, abs=1e-2)
    assert res["relacaoMgK"] == pytest.approx(7.38, abs=1e-2)
    assert res["caSobreT"] == pytest.approx(33.24, abs=1e-2)
    assert res["mgSobreT"] == pytest.approx(13.45, abs=1e-2)
    assert res["hAlSobreT"] == pytest.approx(50.65, abs=1e-2)


def test_granulometria_e_textura_caso_spec():
    gran = calcular_granulometria(
        tfsa=20.0,
        areia_becker=15.9312,
        areia_becker_vazio=4.492,
        argila_becker=4.5824,
        argila_becker_vazio=4.4899,
        naoh_becker=4.479,
        naoh_becker_vazio=4.4711,
    )

    assert gran["pesoAreia"] == pytest.approx(11.4392, abs=1e-4)
    assert gran["pesoSecoNaoh"] == pytest.approx(0.0079, abs=1e-4)
    assert gran["argila10mlCorrigido"] == pytest.approx(0.0846, abs=1e-4)
    assert gran["argila1000ml"] == pytest.approx(8.46, abs=1e-4)
    assert gran["pctAreia"] == pytest.approx(57.196, abs=1e-2)
    assert gran["pctArgila"] == pytest.approx(42.3, abs=1e-2)
    assert gran["pctSilte"] == pytest.approx(0.504, abs=1e-2)

    classe = classificar_textura(gran["pctAreia"], gran["pctSilte"], gran["pctArgila"])
    assert classe == "Argilo Arenoso"


def test_classificar_textura_classes():
    assert classificar_textura(90, 5, 5) == "Areia"
    assert classificar_textura(80, 10, 10) == "Areia Franca"
    assert classificar_textura(60, 30, 10) == "Franco Arenoso"
    assert classificar_textura(55, 20, 25) == "Franco Argilo Arenoso"
    assert classificar_textura(50, 10, 40) == "Argilo Arenoso"
    assert classificar_textura(40, 40, 20) == "Franco"
    assert classificar_textura(30, 60, 10) == "Franco Siltoso"
    assert classificar_textura(5, 92, 3) == "Silte"
    assert classificar_textura(30, 35, 35) == "Franco Argiloso"
    assert classificar_textura(10, 55, 35) == "Franco Argilo Siltoso"
    assert classificar_textura(30, 20, 50) == "Argila"
    assert classificar_textura(10, 45, 45) == "Argilo Siltoso"
    assert classificar_textura(20, 15, 65) == "Muito Argiloso"
