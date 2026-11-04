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

export function classificarTextura(pctAreia: number, pctSilte: number, pctArgila: number): string {
  const areia = pctAreia;
  const silte = pctSilte;
  const argila = pctArgila;

  if (areia >= 85 && silte <= 15 && argila <= 10) return 'Areia';
  if (areia >= 70 && areia < 90 && silte <= 30 && argila <= 15) return 'Areia Franca';
  if (areia >= 45 && areia < 85 && silte <= 50 && argila <= 20) return 'Franco Arenoso';
  if (areia >= 45 && areia < 80 && silte <= 28 && argila >= 20 && argila <= 35) return 'Franco Argilo Arenoso';
  if (areia >= 45 && areia < 65 && silte <= 20 && argila >= 35 && argila <= 55) return 'Argilo Arenoso';
  if (areia >= 23 && areia < 55 && silte >= 28 && silte <= 50 && argila >= 5 && argila <= 28) return 'Franco';
  if (areia < 50 && silte >= 50 && silte <= 90 && argila <= 28) return 'Franco Siltoso';
  if (areia < 20 && silte >= 80 && argila <= 10) return 'Silte';
  if (areia >= 20 && areia < 45 && silte >= 15 && silte <= 53 && argila >= 28 && argila <= 40) return 'Franco Argiloso';
  if (areia < 20 && silte >= 40 && silte <= 73 && argila >= 28 && argila <= 40) return 'Franco Argilo Siltoso';
  if (areia < 45 && silte <= 40 && argila >= 40 && argila <= 60) return 'Argila';
  if (areia < 20 && silte >= 40 && silte <= 60 && argila >= 40 && argila <= 60) return 'Argilo Siltoso';
  if (areia < 40 && silte <= 40 && argila >= 60) return 'Muito Argiloso';

  return 'Franco';
}

export function converterNaParaCmolc(mgPorLitro: number): number {
  return mgPorLitro / 230;
}

export function converterKParaCmolc(mgPorLitro: number): number {
  return mgPorLitro / 391;
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
