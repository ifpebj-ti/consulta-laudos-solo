import type { ObterAnaliseApiResponse } from '@/services/analiseService';
import { numeroOuNulo } from '@/services/respostasApi';
import { DADOS_ANALISE_VAZIOS, type DadosAnalise, type Identificacao } from './tipos';
import { FATOR_DILUICAO_FOSFORO_PADRAO, FATOR_NAOH_PADRAO } from './calculos';

type DadosBancadaApi = ObterAnaliseApiResponse['dados']['dadosBancada'];

const numero = (valor: unknown, padrao: number) => numeroOuNulo(valor) ?? padrao;

export function montarDados(res: ObterAnaliseApiResponse['dados'], identificacao: Identificacao): DadosAnalise {
  const bancada: Partial<DadosBancadaApi> = res.dadosBancada ?? {};
  const quimica: DadosBancadaApi['quimica'] = bancada.quimica ?? {};
  const granulometria: DadosBancadaApi['granulometria'] = bancada.granulometria ?? {};
  const calibracao = bancada.calibracao ?? null;
  const vazio = DADOS_ANALISE_VAZIOS;
  const campo = (valor: { medido?: unknown; branco?: unknown } | null | undefined) => ({
    medido: numero(valor?.medido, 0),
    branco: numero(valor?.branco, 0),
  });
  const a = numeroOuNulo(calibracao?.a);
  const b = numeroOuNulo(calibracao?.b);
  const r2 = numeroOuNulo(calibracao?.r2);
  return {
    identificacao,
    quimica: {
      ph: numero(quimica.ph, vazio.quimica.ph),
      fosforoAbsBruta: numero(quimica.fosforoAbsBruta, vazio.quimica.fosforoAbsBruta),
      fatorDiluicaoFosforo: numero(quimica.fatorDiluicaoFosforo, FATOR_DILUICAO_FOSFORO_PADRAO),
      sodioMgL: numero(quimica.sodioMgL, vazio.quimica.sodioMgL),
      potassioMgL: numero(quimica.potassioMgL, vazio.quimica.potassioMgL),
      calcio: campo(quimica.calcio),
      magnesio: campo(quimica.magnesio),
      aluminio: campo(quimica.aluminio),
      acidezPotencial: {
        ...campo(quimica.acidezPotencial),
        fator: numero(quimica.acidezPotencial?.fator, FATOR_NAOH_PADRAO),
      },
    },
    granulometria: {
      tfsa: numero(granulometria.tfsa, vazio.granulometria.tfsa),
      areiaBecker: numero(granulometria.areiaBecker, vazio.granulometria.areiaBecker),
      areiaBeckerVazio: numero(granulometria.areiaBeckerVazio, vazio.granulometria.areiaBeckerVazio),
      argilaBecker: numero(granulometria.argilaBecker, vazio.granulometria.argilaBecker),
      argilaBeckerVazio: numero(granulometria.argilaBeckerVazio, vazio.granulometria.argilaBeckerVazio),
      naohBecker: numero(granulometria.naohBecker, vazio.granulometria.naohBecker),
      naohBeckerVazio: numero(granulometria.naohBeckerVazio, vazio.granulometria.naohBeckerVazio),
    },
    calibracao:
      a !== null && b !== null && r2 !== null
        ? { a, b, r2, pontos: Array.isArray(calibracao?.pontos) ? calibracao.pontos : undefined }
        : null,
  };
}
