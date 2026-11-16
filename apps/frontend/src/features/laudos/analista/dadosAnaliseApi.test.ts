import { describe, expect, it } from 'vitest';
import { montarDados } from './dadosAnaliseApi';
import { IDENTIFICACAO_VAZIA } from './tipos';
import type { ObterAnaliseApiResponse } from '@/services/analiseService';

const BASE = { protocolo: 'LAB-1', status: 'EM_ANALISE', versao: 1, amostra: { solicitante: 'A', propriedade: 'B' } };

describe('montarDados', () => {
  it('converte números enviados como texto e trata campos nulos', () => {
    const dados = montarDados(
      {
        ...BASE,
        dadosBancada: {
          quimica: { ph: '6.5', sodioMgL: null, calcio: null, acidezPotencial: { medido: '2', branco: null, fator: 'abc' } },
          granulometria: { tfsa: '20' },
          calibracao: { a: '0.29', b: -0.007, r2: 0.999 },
        },
      } as unknown as ObterAnaliseApiResponse['dados'],
      IDENTIFICACAO_VAZIA,
    );
    expect(dados.quimica.ph).toBe(6.5);
    expect(dados.quimica.sodioMgL).toBe(0);
    expect(dados.quimica.calcio).toEqual({ medido: 0, branco: 0 });
    expect(dados.quimica.acidezPotencial).toEqual({ medido: 2, branco: 0, fator: 1 });
    expect(dados.granulometria.tfsa).toBe(20);
    expect(dados.calibracao).toEqual({ a: 0.29, b: -0.007, r2: 0.999, pontos: undefined });
  });

  it('não quebra quando dadosBancada vem nulo', () => {
    const dados = montarDados({ ...BASE, dadosBancada: null } as unknown as ObterAnaliseApiResponse['dados'], IDENTIFICACAO_VAZIA);
    expect(dados.quimica.ph).toBe(0);
    expect(dados.calibracao).toBeNull();
  });

  it('calibração incompleta não é aplicada', () => {
    const dados = montarDados(
      { ...BASE, dadosBancada: { quimica: {}, granulometria: {}, calibracao: { a: null, b: 1, r2: 1 } } } as unknown as ObterAnaliseApiResponse['dados'],
      IDENTIFICACAO_VAZIA,
    );
    expect(dados.calibracao).toBeNull();
  });
});
