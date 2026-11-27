export interface ClienteInfo {
  nome: string;
  cpfMascarado: string;
}

export interface DadosAdicionaisSolo {
  quimica?: {
    sodio?: string | null;
    calcio?: string | null;
    magnesio?: string | null;
    aluminio?: string | null;
    acidezPotencial?: string | null;
  } | null;
  complexoSortivo?: {
    somaBases?: string | null;
    ctcEfetiva?: string | null;
    ctcPotencial?: string | null;
    saturacaoBases?: string | null;
    saturacaoAluminio?: string | null;
    relacaoCaMg?: string | null;
    relacaoCaK?: string | null;
    relacaoMgK?: string | null;
  } | null;
  granulometria?: {
    areia?: string | null;
    silte?: string | null;
    argila?: string | null;
    classeTextural?: string | null;
  } | null;
  amostra?: {
    localizacao?: string | null;
    profundidadeColeta?: string | null;
    cultivo?: string | null;
    responsavelNome?: string | null;
    responsavelCrea?: string | null;
  } | null;
}

export interface ParametrosSolo {
  ph?: number | null;
  materiaOrganica?: string | null;
  fosforo?: string | null;
  potassio?: string | null;
  dadosAdicionais?: DadosAdicionaisSolo | null;
}

export interface LaudoDetalhe {
  protocolo: string;
  status: string;
  cliente: ClienteInfo;
  propriedade: string | null;
  dataEmissao: string | null;
  parametrosSolo?: ParametrosSolo | null;
  temPdfDisponivel: boolean;
  dataPrevistaEntrega?: string | null;
  versao?: number | null;
  atualizadoEm?: string | null;
}
