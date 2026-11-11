import { describe, expect, it } from 'vitest';
import { avaliarDadosAnalise, pendenciasParaProcessar } from './validacaoAnalise';
import { DADOS_ANALISE_VAZIOS, type DadosAnalise } from './tipos';

function dados(parcial: { quimica?: Partial<DadosAnalise['quimica']>; granulometria?: Partial<DadosAnalise['granulometria']> }) {
  return {
    ...DADOS_ANALISE_VAZIOS,
    quimica: { ...DADOS_ANALISE_VAZIOS.quimica, ph: 6, ...parcial.quimica },
    granulometria: { ...DADOS_ANALISE_VAZIOS.granulometria, ...parcial.granulometria },
  };
}

describe('avaliarDadosAnalise', () => {
  it('não acusa nada em dados coerentes', () => {
    expect(avaliarDadosAnalise(dados({}))).toEqual([]);
  });

  it('bloqueia pH fora de 0 a 14 ou inválido', () => {
    expect(avaliarDadosAnalise(dados({ quimica: { ph: 15 } }))[0]).toMatchObject({ id: 'ph', bloqueante: true });
    expect(avaliarDadosAnalise(dados({ quimica: { ph: -1 } }))[0].bloqueante).toBe(true);
    expect(avaliarDadosAnalise(dados({ quimica: { ph: Number.NaN } }))[0].bloqueante).toBe(true);
  });

  it('bloqueia leitura negativa de Na e K', () => {
    const avisos = avaliarDadosAnalise(dados({ quimica: { sodioMgL: -2, potassioMgL: -1 } }));
    expect(avisos.filter((a) => a.bloqueante)).toHaveLength(2);
  });

  it('avisa sem bloquear quando o branco é maior que a leitura', () => {
    const avisos = avaliarDadosAnalise(
      dados({ quimica: { calcio: { medido: 1, branco: 2 }, acidezPotencial: { medido: 2, branco: 3.2, fator: 1 } } }),
    );
    expect(avisos.map((a) => a.id)).toEqual(['liquido-Cálcio (Ca²⁺)', 'liquido-Acidez potencial (H⁺+Al³⁺)']);
    expect(avisos.every((a) => !a.bloqueante)).toBe(true);
  });

  it('avisa quando areia e argila passam de 100%', () => {
    const avisos = avaliarDadosAnalise(
      dados({
        granulometria: {
          tfsa: 20,
          areiaBecker: 20,
          areiaBeckerVazio: 5,
          argilaBecker: 4.6,
          argilaBeckerVazio: 4.5,
          naohBecker: 4.47,
          naohBeckerVazio: 4.47,
        },
      }),
    );
    expect(avisos.some((a) => a.id === 'granulometria-soma')).toBe(true);
  });

  it('avisa peso de fração negativo', () => {
    const avisos = avaliarDadosAnalise(dados({ granulometria: { tfsa: 20, areiaBecker: 4, areiaBeckerVazio: 5 } }));
    expect(avisos.some((a) => a.id === 'granulometria-negativa')).toBe(true);
  });
});

describe('pendenciasParaProcessar', () => {
  it('amostra recém-criada lista o que falta para processar', () => {
    const pendencias = pendenciasParaProcessar(DADOS_ANALISE_VAZIOS);
    expect(pendencias.bloqueantes).toEqual(['curva de calibração do fósforo', 'peso da amostra (TFSA)']);
    expect(pendencias.semValor).toContain('pH');
  });

  it('fica sem bloqueios quando calibração, TFSA e fator estão ok', () => {
    const pendencias = pendenciasParaProcessar({
      ...dados({ granulometria: { tfsa: 20 } }),
      calibracao: { a: 0.29, b: -0.007, r2: 0.999 },
    });
    expect(pendencias.bloqueantes).toEqual([]);
  });

  it('inclui pH inválido e fator do NaOH inválido', () => {
    const pendencias = pendenciasParaProcessar({
      ...dados({ quimica: { ph: 20, acidezPotencial: { medido: 1, branco: 0, fator: 0 } }, granulometria: { tfsa: 20 } }),
      calibracao: { a: 0.29, b: -0.007, r2: 0.999 },
    });
    expect(pendencias.bloqueantes).toEqual(['fator de correção do NaOH', 'o ph deve estar entre 0 e 14']);
  });
});
