import { describe, expect, it } from 'vitest';
import {
  calcularAcidezPotencial,
  calcularComplexoSortivo,
  calcularConcentracaoFosforo,
  calcularGranulometria,
  calcularRegressaoLinear,
  classificarTextura,
  converterKParaCmolc,
  converterNaParaCmolc,
  REGRAS_TRIANGULO_TEXTURAL,
} from './calculos';
import { avaliarDadosAnalise } from './validacaoAnalise';
import { DADOS_ANALISE_VAZIOS } from './tipos';

const EXTREMOS = [0, -0, 1, -1, 0.0001, -0.0001, 3.2, 4.8, 100, 1e6, -1e6, 1e-9, Number.MAX_SAFE_INTEGER];

function semInfinitoNemNaN(valor: unknown, caminho = 'resultado'): void {
  if (typeof valor === 'number') {
    expect(Number.isFinite(valor), `${caminho} = ${valor}`).toBe(true);
    return;
  }
  if (valor && typeof valor === 'object') {
    Object.entries(valor).forEach(([chave, interno]) => semInfinitoNemNaN(interno, `${caminho}.${chave}`));
  }
}

function aleatorio(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

describe('varredura dos cálculos com entradas extremas', () => {
  it('complexo sortivo nunca devolve Infinity ou NaN e as relações com zero viram null', () => {
    for (const ca of EXTREMOS) {
      for (const mg of EXTREMOS) {
        for (const k of [0, 0.12, 1e6]) {
          const resultado = calcularComplexoSortivo({ ca, mg, al: 0.3, hAl: 1.6, naCmolc: 0.05, kCmolc: k });
          if (mg === 0) expect(resultado.relacaoCaMg).toBeNull();
          if (k === 0) {
            expect(resultado.relacaoCaK).toBeNull();
            expect(resultado.relacaoMgK).toBeNull();
          }
          semInfinitoNemNaN(resultado);
        }
      }
    }
  });

  it('CTC zerada não divide por zero', () => {
    const resultado = calcularComplexoSortivo({ ca: 0, mg: 0, al: 0, hAl: 0, naCmolc: 0, kCmolc: 0 });
    semInfinitoNemNaN(resultado);
    expect(resultado.saturacaoBases).toBe(0);
    expect(resultado.saturacaoAluminio).toBe(0);
  });

  it('granulometria com TFSA zero ou negativo não calcula percentuais', () => {
    for (const tfsa of [0, -0, -20]) {
      const resultado = calcularGranulometria({ ...DADOS_ANALISE_VAZIOS.granulometria, tfsa, areiaBecker: 10 });
      expect(resultado.pctAreia).toBeNull();
      expect(resultado.pctSilte).toBeNull();
      expect(resultado.pctArgila).toBeNull();
    }
  });

  it('granulometria válida sempre soma 100% e é finita', () => {
    const sortear = aleatorio(42);
    for (let i = 0; i < 2000; i += 1) {
      const entrada = {
        tfsa: 0.5 + sortear() * 50,
        areiaBecker: sortear() * 30,
        areiaBeckerVazio: sortear() * 30,
        argilaBecker: sortear() * 10,
        argilaBeckerVazio: sortear() * 10,
        naohBecker: sortear() * 10,
        naohBeckerVazio: sortear() * 10,
      };
      const resultado = calcularGranulometria(entrada);
      semInfinitoNemNaN(resultado);
      expect((resultado.pctAreia ?? 0) + (resultado.pctSilte ?? 0) + (resultado.pctArgila ?? 0)).toBeCloseTo(100, 6);
    }
  });

  it('regressão com menos de dois pontos distintos não gera NaN nem Infinity', () => {
    semInfinitoNemNaN(calcularRegressaoLinear([{ x: 1, y: 1 }]));
    semInfinitoNemNaN(calcularRegressaoLinear([{ x: 2, y: 1 }, { x: 2, y: 3 }]));
    semInfinitoNemNaN(calcularRegressaoLinear([{ x: 0, y: 0 }, { x: 0, y: 0 }]));
  });

  it('fósforo com coeficiente zero devolve null e nos demais casos é finito', () => {
    expect(calcularConcentracaoFosforo(0.6, { a: 0, b: 0, r2: 1 }, 1)).toBeNull();
    for (const leitura of EXTREMOS) {
      semInfinitoNemNaN(calcularConcentracaoFosforo(leitura, { a: 0.2899, b: -0.0074, r2: 0.999 }, 10));
    }
  });

  it('acidez potencial e conversões de Na e K são finitas para entradas extremas', () => {
    for (const leitura of EXTREMOS) {
      for (const fator of [0, -1, Number.NaN, 0.5, 1, 2]) {
        semInfinitoNemNaN(calcularAcidezPotencial(leitura, 3.2, fator));
      }
      semInfinitoNemNaN(converterNaParaCmolc(leitura));
      semInfinitoNemNaN(converterKParaCmolc(leitura));
    }
  });
});

describe('varredura do triângulo textural', () => {
  it('toda combinação válida (passo 0,25) tem exatamente uma classe', () => {
    const falhas: string[] = [];
    let pontos = 0;
    for (let i = 0; i <= 400; i += 1) {
      const argila = i / 4;
      for (let j = 0; j <= 400 - i; j += 1) {
        const silte = j / 4;
        const areia = 100 - argila - silte;
        const fracoes = { areia, silte, argila };
        const classes = REGRAS_TRIANGULO_TEXTURAL.filter((regra) => regra.pertence(fracoes));
        pontos += 1;
        if (classes.length !== 1 || classificarTextura(areia, silte, argila) !== classes[0].classe) {
          falhas.push(JSON.stringify({ ...fracoes, classes: classes.map((c) => c.classe) }));
        }
      }
    }
    expect(pontos).toBeGreaterThan(80_000);
    expect(falhas).toEqual([]);
  }, 30_000);

  it('fronteiras exatas de argila caem numa única classe', () => {
    for (const argila of [7, 12, 15, 20, 27, 35, 40, 60]) {
      for (let silte = 0; silte <= 100 - argila; silte += 1) {
        const fracoes = { areia: 100 - argila - silte, silte, argila };
        expect(REGRAS_TRIANGULO_TEXTURAL.filter((regra) => regra.pertence(fracoes))).toHaveLength(1);
      }
    }
  });

  it('entradas inválidas devolvem null', () => {
    expect(classificarTextura(Number.NaN, 50, 50)).toBeNull();
    expect(classificarTextura(Number.POSITIVE_INFINITY, 0, 0)).toBeNull();
    expect(classificarTextura(60, 30, 30)).toBeNull();
    expect(classificarTextura(-5, 55, 50)).toBeNull();
    expect(classificarTextura(101, 0, 0)).toBeNull();
  });
});

describe('validação da análise com dados aleatórios', () => {
  it('nunca lança erro e sempre devolve avisos com mensagem', () => {
    const sortear = aleatorio(7);
    const valor = () => (sortear() - 0.3) * 40;
    for (let i = 0; i < 1000; i += 1) {
      const dados = {
        ...DADOS_ANALISE_VAZIOS,
        quimica: {
          ph: valor(),
          fosforoAbsBruta: valor(),
          sodioMgL: valor(),
          potassioMgL: valor(),
          calcio: { medido: valor(), branco: valor() },
          magnesio: { medido: valor(), branco: valor() },
          aluminio: { medido: valor(), branco: valor() },
          acidezPotencial: { medido: valor(), branco: valor(), fator: valor() },
        },
        granulometria: {
          tfsa: valor(),
          areiaBecker: valor(),
          areiaBeckerVazio: valor(),
          argilaBecker: valor(),
          argilaBeckerVazio: valor(),
          naohBecker: valor(),
          naohBeckerVazio: valor(),
        },
      };
      const avisos = avaliarDadosAnalise(dados);
      avisos.forEach((aviso) => {
        expect(aviso.mensagem.length).toBeGreaterThan(0);
        expect(aviso.mensagem).not.toMatch(/undefined|NaN|null/);
      });
    }
  });
});
