import { describe, expect, it } from 'vitest';
import {
  calcularAcidezPotencial,
  calcularComplexoSortivo,
  FATOR_NAOH_PADRAO,
  fatorNaohValido,
  calcularConcentracaoFosforo,
  calcularGranulometria,
  calcularRegressaoLinear,
  classificarTextura,
  REGRAS_TRIANGULO_TEXTURAL,
  converterKParaCmolc,
  converterNaParaCmolc,
  FATOR_K_MG_L_PARA_CMOLC,
  FATOR_NA_MG_L_PARA_CMOLC,
} from './calculos';
import { calcularPrevisaoEntrega, formatarData, urgenciaPrazo, hojeIso } from './statusAmostra';

describe('calibração de fósforo', () => {
  it('ajusta reta exata com R² = 1', () => {
    const regressao = calcularRegressaoLinear([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]);
    expect(regressao.a).toBeCloseTo(2);
    expect(regressao.b).toBeCloseTo(1);
    expect(regressao.r2).toBeCloseTo(1);
  });

  it('não divide por zero quando todos os x são iguais', () => {
    expect(calcularRegressaoLinear([{ x: 1, y: 1 }, { x: 1, y: 2 }]).a).toBe(0);
  });

  it('calcula a concentração com fator de diluição e recusa coeficiente nulo', () => {
    const resultado = calcularConcentracaoFosforo(5, { a: 2, b: 1, r2: 1 }, 2);
    expect(resultado).toEqual({ curva: 20, fosforo: 40 });
    expect(calcularConcentracaoFosforo(5, { a: 0, b: 1, r2: 1 }, 1)).toBeNull();
  });
});

describe('granulometria', () => {
  it('calcula frações e omite percentuais sem TFSA', () => {
    const entrada = {
      tfsa: 20,
      areiaBecker: 15.9312,
      areiaBeckerVazio: 4.492,
      argilaBecker: 4.5824,
      argilaBeckerVazio: 4.4899,
      naohBecker: 4.479,
      naohBeckerVazio: 4.4711,
    };
    const resultado = calcularGranulometria(entrada);
    expect(resultado.pctAreia).toBeCloseTo(57.196, 2);
    expect(resultado.pctArgila).toBeCloseTo(42.3, 1);
    expect((resultado.pctAreia ?? 0) + (resultado.pctArgila ?? 0) + (resultado.pctSilte ?? 0)).toBeCloseTo(100);
    expect(calcularGranulometria({ ...entrada, tfsa: 0 }).pctAreia).toBeNull();
  });

  it('classifica os exemplos reais do laboratório', () => {
    expect(classificarTextura(57.196, 0.504, 42.3)).toBe('Argilo Arenoso');
    expect(classificarTextura(90, 6, 4)).toBe('Areia');
  });

  it('não tem ambiguidade nas fronteiras de argila', () => {
    expect(classificarTextura(70, 15, 15)).toBe('Franco Arenoso');
    expect(classificarTextura(50, 15, 35)).toBe('Argilo Arenoso');
    expect(classificarTextura(30, 30, 40)).toBe('Argila');
    expect(classificarTextura(25, 36, 39)).toBe('Franco Argiloso');
    expect(classificarTextura(20, 41, 39)).toBe('Franco Argilo Siltoso');
    expect(classificarTextura(10, 50, 40)).toBe('Argilo Siltoso');
    expect(classificarTextura(20, 20, 60)).toBe('Muito Argiloso');
    expect(classificarTextura(30, 11, 59)).toBe('Argila');
  });

  it('classifica os cantos do triângulo', () => {
    expect(classificarTextura(100, 0, 0)).toBe('Areia');
    expect(classificarTextura(0, 100, 0)).toBe('Silte');
    expect(classificarTextura(0, 0, 100)).toBe('Muito Argiloso');
  });

  it('rejeita frações que não somam 100 ou fora da faixa', () => {
    expect(classificarTextura(50, 30, 30)).toBeNull();
    expect(classificarTextura(-1, 51, 50)).toBeNull();
    expect(classificarTextura(Number.NaN, 50, 50)).toBeNull();
    expect(classificarTextura(33.6, 33, 33)).toBe('Franco Argiloso');
  });

  it('enquadra cada ponto do triângulo em exatamente uma classe', () => {
    for (let argila = 0; argila <= 100; argila += 0.5) {
      for (let silte = 0; silte <= 100 - argila; silte += 0.5) {
        const fracoes = { areia: 100 - argila - silte, silte, argila };
        const classes = REGRAS_TRIANGULO_TEXTURAL.filter((regra) => regra.pertence(fracoes)).map((r) => r.classe);
        expect(classes, JSON.stringify(fracoes)).toHaveLength(1);
      }
    }
  });
});

describe('acidez potencial (H+Al)', () => {
  it('aplica (leitura × fator do NaOH) − branco, como a célula L28 da planilha', () => {
    expect(calcularAcidezPotencial(4.8, 3.2, 1)).toBeCloseTo(1.6);
  });

  it('considera fator diferente de 1', () => {
    expect(calcularAcidezPotencial(4.8, 3.2, 1.05)).toBeCloseTo(1.84);
  });

  it('usa fator 1 quando ausente ou inválido', () => {
    expect(FATOR_NAOH_PADRAO).toBe(1);
    expect(calcularAcidezPotencial(4.8, 3.2)).toBeCloseTo(1.6);
    expect(calcularAcidezPotencial(4.8, 3.2, 0)).toBeCloseTo(1.6);
    expect(calcularAcidezPotencial(4.8, 3.2, Number.NaN)).toBeCloseTo(1.6);
    expect(fatorNaohValido(0)).toBe(false);
    expect(fatorNaohValido(-1)).toBe(false);
    expect(fatorNaohValido(0.98)).toBe(true);
  });

  it('não esconde resultado negativo quando o branco é maior que o produto', () => {
    expect(calcularAcidezPotencial(2, 3.2, 1)).toBeCloseTo(-1.2);
  });

  it('o H+Al corrigido entra na CTC potencial', () => {
    const hAl = calcularAcidezPotencial(4.8, 3.2, 1);
    const resultado = calcularComplexoSortivo({ ca: 2.2, mg: 2, al: 0, hAl, naCmolc: 0, kCmolc: 0 });
    expect(resultado.ctcPotencial).toBeCloseTo(5.8);
    expect(resultado.hAlSobreT).toBeCloseTo((1.6 / 5.8) * 100);
  });
});
describe('complexo sortivo', () => {
  it('soma bases e calcula saturações sem dividir por zero', () => {
    const resultado = calcularComplexoSortivo({ ca: 2, mg: 1, al: 0.5, hAl: 3, naCmolc: 0.1, kCmolc: 0.4 });
    expect(resultado.somaBases).toBeCloseTo(3.5);
    expect(resultado.ctcPotencial).toBeCloseTo(6.5);
    expect(resultado.ctcEfetiva).toBeCloseTo(4);
    expect(resultado.saturacaoBases).toBeCloseTo(53.846, 2);
    const zerado = calcularComplexoSortivo({ ca: 0, mg: 0, al: 0, hAl: 0, naCmolc: 0, kCmolc: 0 });
    expect(zerado.saturacaoBases).toBe(0);
    expect(zerado.relacaoCaMg).toBeNull();
  });

  it('usa os fatores da planilha do laboratório (Na ÷ 230, K ÷ 391) na soma de bases e nas relações', () => {
    expect(FATOR_NA_MG_L_PARA_CMOLC).toBe(230);
    expect(FATOR_K_MG_L_PARA_CMOLC).toBe(391);
    const naCmolc = converterNaParaCmolc(23);
    const kCmolc = converterKParaCmolc(39.1);
    expect(naCmolc).toBeCloseTo(0.1);
    expect(kCmolc).toBeCloseTo(0.1);
    const resultado = calcularComplexoSortivo({ ca: 2, mg: 1, al: 0, hAl: 2, naCmolc, kCmolc });
    expect(resultado.somaBases).toBeCloseTo(3.2);
    expect(resultado.ctcPotencial).toBeCloseTo(5.2);
    expect(resultado.relacaoCaK).toBeCloseTo(20);
    expect(resultado.relacaoMgK).toBeCloseTo(10);
  });

  it('converte Na e K de mg/L para cmolc', () => {
    expect(converterNaParaCmolc(230)).toBeCloseTo(1);
    expect(converterKParaCmolc(391)).toBeCloseTo(1);
  });
});

describe('prazos', () => {
  it('soma 15 dias corridos inclusive na virada de mês e ano', () => {
    expect(calcularPrevisaoEntrega('2026-12-20')).toBe('2027-01-04');
    expect(calcularPrevisaoEntrega('')).toBe('');
  });

  it('classifica a urgência do prazo', () => {
    expect(urgenciaPrazo('').rotulo).toBe('Sem prazo definido');
    expect(urgenciaPrazo('2000-01-01').rotulo).toBe('Atrasado');
    expect(urgenciaPrazo(hojeIso()).rotulo).toBe('Vence hoje');
    expect(urgenciaPrazo('2999-01-01').rotulo).toBe('No prazo');
  });

  it('formata datas ISO em pt-BR', () => {
    expect(formatarData('2026-11-10')).toBe('10/11/2026');
    expect(formatarData('')).toBe('—');
  });
});
