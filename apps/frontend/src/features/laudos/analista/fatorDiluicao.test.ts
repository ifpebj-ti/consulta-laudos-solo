import { describe, expect, it } from 'vitest';
import {
  calcularConcentracaoFosforo,
  calcularRegressaoLinear,
  FATOR_DILUICAO_FOSFORO_PADRAO,
  fatorDiluicaoAplicado,
  fatorDiluicaoValido,
} from './calculos';
import { montarDados } from './dadosAnaliseApi';
import { pendenciasParaProcessar } from './validacaoAnalise';
import { DADOS_ANALISE_VAZIOS, IDENTIFICACAO_VAZIA } from './tipos';
import type { ObterAnaliseApiResponse } from '@/services/analiseService';

const CURVA_PLANILHA = { a: 0.2899, b: -0.0074, r2: 1 };

describe('fator de diluição do fósforo (planilha Analise dos Dados, amostra 26063.2808)', () => {
  it('leitura 0,292 com fator 10 dá 103,28 mg/dm³, como a célula M10', () => {
    expect(calcularConcentracaoFosforo(0.292, CURVA_PLANILHA, 10)?.fosforo).toBeCloseTo(103.27699206622974, 10);
    expect(calcularConcentracaoFosforo(0.292, CURVA_PLANILHA, 10)?.curva).toBeCloseTo(10.327699206622974, 10);
  });

  it('com fator 1 dá 10,33 mg/dm³', () => {
    expect(calcularConcentracaoFosforo(0.292, CURVA_PLANILHA, 1)?.fosforo.toFixed(2)).toBe('10.33');
  });

  it('a curva da planilha (B9:F10) dá os coeficientes usados na fórmula K10', () => {
    const regressao = calcularRegressaoLinear([
      { x: 0, y: 0 },
      { x: 1, y: 0.281 },
      { x: 2, y: 0.561 },
      { x: 3, y: 0.86 },
      { x: 4, y: 1.16 },
    ]);
    expect(regressao.a).toBeCloseTo(0.2899, 4);
    expect(regressao.b).toBeCloseTo(-0.0074, 4);
  });

  it('valida o fator e usa 10 quando falta', () => {
    expect(FATOR_DILUICAO_FOSFORO_PADRAO).toBe(10);
    expect([10, 1, 0.5].every(fatorDiluicaoValido)).toBe(true);
    expect([0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined, null].some((f) => fatorDiluicaoValido(f))).toBe(false);
    expect(fatorDiluicaoAplicado(undefined)).toBe(10);
    expect(fatorDiluicaoAplicado(0)).toBe(10);
    expect(fatorDiluicaoAplicado(5)).toBe(5);
  });

  it('amostra nova e amostra antiga do servidor abrem com fator 10', () => {
    expect(DADOS_ANALISE_VAZIOS.quimica.fatorDiluicaoFosforo).toBe(10);
    const antiga = montarDados(
      { protocolo: 'X', status: 'EM_ANALISE', versao: 1, amostra: { solicitante: '', propriedade: '' }, dadosBancada: { quimica: {}, granulometria: {}, calibracao: null } } as ObterAnaliseApiResponse['dados'],
      IDENTIFICACAO_VAZIA,
    );
    expect(antiga.quimica.fatorDiluicaoFosforo).toBe(10);
  });

  it('fator inválido bloqueia o processamento', () => {
    const dados = {
      ...DADOS_ANALISE_VAZIOS,
      quimica: { ...DADOS_ANALISE_VAZIOS.quimica, fatorDiluicaoFosforo: 0 },
      granulometria: { ...DADOS_ANALISE_VAZIOS.granulometria, tfsa: 20 },
      calibracao: CURVA_PLANILHA,
    };
    expect(pendenciasParaProcessar(dados).bloqueantes).toContain('fator de diluição do fósforo');
  });
});
