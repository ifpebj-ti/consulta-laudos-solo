import type { EntradaGranulometria, RegressaoLinear } from './calculos';

export interface CampoComBranco {
  medido: number;
  branco: number;
}

export type TipoAnalise = 'fisica' | 'quimica' | 'fisico_quimica';

export const ROTULOS_TIPO_ANALISE: Record<TipoAnalise, string> = {
  fisica: 'Física',
  quimica: 'Química',
  fisico_quimica: 'Física/Química',
};

export interface Identificacao {
  protocolo: string;
  cpfCliente?: string;
  dataRecebimento: string;
  /** Previsão de entrega do laudo: data de recebimento + 15 dias. */
  prazo: string;
  tipoAnalise: TipoAnalise | '';
  solicitante: string;
  dataEmissao: string;
  propriedade: string;
  localizacao: string;
  areaIdentificacao: string;
  areaHectares: string;
  profundidadeColeta: string;
  cultivo: string;
  culturaExistente: string;
  /** Contato opcional — só aparece no laudo quando preenchido. */
  email: string;
  telefone: string;
}

export const IDENTIFICACAO_VAZIA: Identificacao = {
  protocolo: '',
  cpfCliente: '',
  dataRecebimento: '',
  prazo: '',
  tipoAnalise: '',
  solicitante: '',
  dataEmissao: '',
  propriedade: '',
  localizacao: '',
  areaIdentificacao: '',
  areaHectares: '',
  profundidadeColeta: '',
  cultivo: '',
  culturaExistente: '',
  email: '',
  telefone: '',
};

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
  identificacao: Identificacao;
  quimica: DadosQuimica;
  granulometria: EntradaGranulometria;
  calibracao: RegressaoLinear | null;
}

/** Estado inicial de uma análise, criada a partir do modal Nova Amostra. */
export const DADOS_ANALISE_VAZIOS: DadosAnalise = {
  identificacao: IDENTIFICACAO_VAZIA,
  quimica: {
    ph: 0,
    fosforoAbsBruta: 0,
    sodioMgL: 0,
    potassioMgL: 0,
    calcio: { medido: 0, branco: 0 },
    magnesio: { medido: 0, branco: 0 },
    aluminio: { medido: 0, branco: 0 },
    acidezPotencial: { medido: 0, branco: 0 },
  },
  granulometria: {
    tfsa: 0,
    areiaBecker: 0,
    areiaBeckerVazio: 0,
    argilaBecker: 0,
    argilaBeckerVazio: 0,
    naohBecker: 0,
    naohBeckerVazio: 0,
  },
  calibracao: null,
};

export type StatusAmostra = 'nao_iniciado' | 'em_andamento' | 'concluido';

/**
 * Um registro completo de amostra guardado na sessão do Analista — mantém o
 * DadosAnalise inteiro (não só a identificação) para permitir retomar uma
 * análise iniciada e não concluída.
 */
export interface AmostraRegistro {
  dados: DadosAnalise;
  status: StatusAmostra;
  criadaEm: string;
}

/** Forma enxuta usada nos cards do painel — não carrega química/física. */
export interface CartaoAmostra {
  protocolo: string;
  solicitante: string;
  propriedade: string;
  prazo: string;
  status: StatusAmostra;
}
