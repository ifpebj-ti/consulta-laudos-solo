export interface ClienteInfo {
  nome: string;
  cpfMascarado: string;
}

export interface ParametrosSolo {
  ph?: number | null;
  materiaOrganica?: string | null;
  fosforo?: string | null;
  potassio?: string | null;
  dadosAdicionais?: Record<string, unknown> | null;
}

export interface LaudoDetalhe {
  protocolo: string;
  status: string;
  cliente: ClienteInfo;
  propriedade: string;
  dataEmissao: string;
  parametrosSolo: ParametrosSolo;
  temPdfDisponivel: boolean;
}
