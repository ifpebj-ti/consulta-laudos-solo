import type { EntradaGranulometria, RegressaoLinear } from './calculos';

export interface CampoComBranco {
  medido: number;
  branco: number;
}

export interface DadosQuimica {
  ph: number;
  fosforoAbsBruta: number;
  sodioMgL: number;
  potassioMgL: number;
  calcio: CampoComBranco;
  magnesio: CampoComBranco;
  aluminio: CampoComBranco;
  acidezPotencial: CampoComBranco;
}

export interface DadosAnalise {
  quimica: DadosQuimica;
  granulometria: EntradaGranulometria;
  calibracao: RegressaoLinear | null;
}

export const DADOS_ANALISE_INICIAIS: DadosAnalise = {
  quimica: {
    ph: 5.4,
    fosforoAbsBruta: 0.612,
    sodioMgL: 12,
    potassioMgL: 45,
    calcio: { medido: 2.1, branco: 0 },
    magnesio: { medido: 0.85, branco: 0 },
    aluminio: { medido: 0.3, branco: 0 },
    acidezPotencial: { medido: 3.2, branco: 0 },
  },
  granulometria: {
    tfsa: 20,
    areiaBecker: 15.9312,
    areiaBeckerVazio: 4.492,
    argilaBecker: 4.5824,
    argilaBeckerVazio: 4.4899,
    naohBecker: 4.479,
    naohBeckerVazio: 4.4711,
  },
  calibracao: null,
};
