export interface PontoCalibracao {
  x: number;
  y: number;
}

export interface RegressaoLinear {
  a: number;
  b: number;
  r2: number;
  pontos?: PontoCalibracao[];
}

export function calcularRegressaoLinear(pontos: PontoCalibracao[]): RegressaoLinear {
  const n = pontos.length;
  let somaX = 0;
  let somaY = 0;
  let somaXY = 0;
  let somaX2 = 0;

  for (const ponto of pontos) {
    somaX += ponto.x;
    somaY += ponto.y;
    somaXY += ponto.x * ponto.y;
    somaX2 += ponto.x * ponto.x;
  }

  const denominador = n * somaX2 - somaX * somaX;
  const a = denominador !== 0 ? (n * somaXY - somaX * somaY) / denominador : 0;
  const b = (somaY - a * somaX) / n;

  const mediaY = somaY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const ponto of pontos) {
    const yPrevisto = a * ponto.x + b;
    ssRes += (ponto.y - yPrevisto) ** 2;
    ssTot += (ponto.y - mediaY) ** 2;
  }
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 1;

  return { a, b, r2 };
}

export function calcularConcentracaoFosforo(
  leituraAmostra: number,
  coef: RegressaoLinear,
  fatorDiluicao: number,
): { curva: number; fosforo: number } | null {
  if (coef.a === 0) return null;
  const xBruto = (leituraAmostra - coef.b) / coef.a;
  const curva = xBruto * 10;
  return { curva, fosforo: curva * fatorDiluicao };
}

export function calcularValorLiquido(medido: number, branco: number): number {
  return medido - branco;
}

export const FATOR_NAOH_PADRAO = 1;

export function fatorNaohValido(fator: number): boolean {
  return Number.isFinite(fator) && fator > 0;
}

export function calcularAcidezPotencial(leitura: number, branco: number, fator: number = FATOR_NAOH_PADRAO): number {
  const fatorAplicado = fatorNaohValido(fator) ? fator : FATOR_NAOH_PADRAO;
  return leitura * fatorAplicado - branco;
}

export interface EntradaGranulometria {
  tfsa: number;
  areiaBecker: number;
  areiaBeckerVazio: number;
  argilaBecker: number;
  argilaBeckerVazio: number;
  naohBecker: number;
  naohBeckerVazio: number;
}

export interface ResultadoGranulometria {
  pesoAreia: number;
  pesoSecoNaoh: number;
  argila10mlCorrigido: number;
  argila1000ml: number;
  pctAreia: number | null;
  pctSilte: number | null;
  pctArgila: number | null;
}

export function calcularGranulometria(entrada: EntradaGranulometria): ResultadoGranulometria {
  const pesoAreia = entrada.areiaBecker - entrada.areiaBeckerVazio;
  const pesoSecoNaoh = entrada.naohBecker - entrada.naohBeckerVazio;
  const argila10mlBruto = entrada.argilaBecker - entrada.argilaBeckerVazio;
  const argila10mlCorrigido = argila10mlBruto - pesoSecoNaoh;
  const argila1000ml = argila10mlCorrigido * 100;

  if (entrada.tfsa <= 0) {
    return { pesoAreia, pesoSecoNaoh, argila10mlCorrigido, argila1000ml, pctAreia: null, pctSilte: null, pctArgila: null };
  }

  const pctAreia = (pesoAreia / entrada.tfsa) * 100;
  const pctArgila = (argila1000ml / entrada.tfsa) * 100;
  const pctSilte = 100 - pctAreia - pctArgila;

  return { pesoAreia, pesoSecoNaoh, argila10mlCorrigido, argila1000ml, pctAreia, pctSilte, pctArgila };
}

export type ClasseTextural =
  | 'Areia'
  | 'Areia Franca'
  | 'Franco Arenoso'
  | 'Franco'
  | 'Franco Siltoso'
  | 'Silte'
  | 'Franco Argilo Arenoso'
  | 'Franco Argiloso'
  | 'Franco Argilo Siltoso'
  | 'Argilo Arenoso'
  | 'Argilo Siltoso'
  | 'Argila'
  | 'Muito Argiloso';

type Fracoes = { areia: number; silte: number; argila: number };

export const REGRAS_TRIANGULO_TEXTURAL: ReadonlyArray<{ classe: ClasseTextural; pertence: (f: Fracoes) => boolean }> = [
  { classe: 'Muito Argiloso', pertence: ({ argila }) => argila >= 60 },
  { classe: 'Argilo Siltoso', pertence: ({ argila, silte }) => argila >= 40 && argila < 60 && silte >= 40 },
  { classe: 'Argilo Arenoso', pertence: ({ argila, areia }) => argila >= 35 && argila < 60 && areia > 45 },
  {
    classe: 'Argila',
    pertence: ({ argila, silte, areia }) => argila >= 40 && argila < 60 && silte < 40 && areia <= 45,
  },
  {
    classe: 'Franco Argilo Siltoso',
    pertence: ({ argila, areia }) => argila >= 27 && argila < 40 && areia <= 20,
  },
  {
    classe: 'Franco Argiloso',
    pertence: ({ argila, areia }) => argila >= 27 && argila < 40 && areia > 20 && areia <= 45,
  },
  {
    classe: 'Franco Argilo Arenoso',
    pertence: ({ argila, silte, areia }) => argila >= 20 && argila < 35 && silte < 28 && areia > 45,
  },
  {
    classe: 'Franco',
    pertence: ({ argila, silte, areia }) => argila >= 7 && argila < 27 && silte >= 28 && silte < 50 && areia <= 52,
  },
  { classe: 'Silte', pertence: ({ argila, silte }) => silte >= 80 && argila < 12 },
  {
    classe: 'Franco Siltoso',
    pertence: ({ argila, silte }) => (silte >= 50 && argila >= 12 && argila < 27) || (silte >= 50 && silte < 80 && argila < 12),
  },
  { classe: 'Areia', pertence: ({ argila, silte }) => silte + 1.5 * argila < 15 },
  {
    classe: 'Areia Franca',
    pertence: ({ argila, silte }) => silte + 1.5 * argila >= 15 && silte + 2 * argila < 30,
  },
  {
    classe: 'Franco Arenoso',
    pertence: ({ argila, silte, areia }) =>
      silte + 2 * argila >= 30 &&
      ((argila >= 7 && argila < 20 && areia > 52) || (argila < 7 && silte < 50)),
  },
];

export const TOLERANCIA_SOMA_FRACOES = 1;

export function classificarTextura(pctAreia: number, pctSilte: number, pctArgila: number): ClasseTextural | null {
  const fracoes = { areia: pctAreia, silte: pctSilte, argila: pctArgila };
  const valores = Object.values(fracoes);
  if (valores.some((valor) => !Number.isFinite(valor) || valor < 0 || valor > 100)) return null;
  if (Math.abs(pctAreia + pctSilte + pctArgila - 100) > TOLERANCIA_SOMA_FRACOES) return null;
  return REGRAS_TRIANGULO_TEXTURAL.find((regra) => regra.pertence(fracoes))?.classe ?? null;
}

export const FATOR_NA_MG_L_PARA_CMOLC = 230;

export const FATOR_K_MG_L_PARA_CMOLC = 391;

export function converterNaParaCmolc(mgPorLitro: number): number {
  return mgPorLitro / FATOR_NA_MG_L_PARA_CMOLC;
}

export function converterKParaCmolc(mgPorLitro: number): number {
  return mgPorLitro / FATOR_K_MG_L_PARA_CMOLC;
}

export interface ComplexoSortivo {
  somaBases: number;
  ctcEfetiva: number;
  ctcPotencial: number;
  saturacaoBases: number;
  saturacaoAluminio: number;
  relacaoCaMg: number | null;
  relacaoCaK: number | null;
  relacaoMgK: number | null;
  caSobreT: number;
  mgSobreT: number;
  hAlSobreT: number;
}

export function calcularComplexoSortivo(params: {
  ca: number;
  mg: number;
  al: number;
  hAl: number;
  naCmolc: number;
  kCmolc: number;
}): ComplexoSortivo {
  const { ca, mg, al, hAl, naCmolc, kCmolc } = params;
  const somaBases = ca + mg + naCmolc + kCmolc;
  const ctcPotencial = somaBases + hAl;
  const ctcEfetiva = somaBases + al;

  return {
    somaBases,
    ctcEfetiva,
    ctcPotencial,
    saturacaoBases: ctcPotencial !== 0 ? (somaBases / ctcPotencial) * 100 : 0,
    saturacaoAluminio: ctcEfetiva !== 0 ? (al / ctcEfetiva) * 100 : 0,
    relacaoCaMg: mg !== 0 ? ca / mg : null,
    relacaoCaK: kCmolc !== 0 ? ca / kCmolc : null,
    relacaoMgK: kCmolc !== 0 ? mg / kCmolc : null,
    caSobreT: ctcPotencial !== 0 ? (ca / ctcPotencial) * 100 : 0,
    mgSobreT: ctcPotencial !== 0 ? (mg / ctcPotencial) * 100 : 0,
    hAlSobreT: ctcPotencial !== 0 ? (hAl / ctcPotencial) * 100 : 0,
  };
}
