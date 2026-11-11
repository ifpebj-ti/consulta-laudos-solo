import { apiClient } from './apiClient';
import type { DadosAnalise, TipoAnalise } from '@/features/laudos/analista/tipos';
import type { RegressaoLinear } from '@/features/laudos/analista/calculos';
import type { StatusLaudoServidor } from '@/lib/statusLaudo';

export interface AmostraMetadata {
  solicitante: string;
  propriedade: string;
  dataColeta?: string | null;
}

type Parcial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> | null : T[K] | null };

export interface CalibracaoApi {
  a?: number | null;
  b?: number | null;
  r2?: number | null;
  pontos?: RegressaoLinear['pontos'] | null;
}

export interface ObterAnaliseApiResponse {
  sucesso: boolean;
  dados: {
    protocolo: string;
    status: string;
    versao: number;
    amostra: AmostraMetadata;
    dadosBancada: {
      quimica: Parcial<DadosAnalise['quimica']>;
      granulometria: Parcial<DadosAnalise['granulometria']>;
      calibracao: CalibracaoApi | null;
    };
    atualizadoEm?: string | null;
    atualizadoPor?: string | null;
  };
}

export interface SalvarRascunhoPayload {
  versaoEsperada: number;
  quimica?: Partial<DadosAnalise['quimica']>;
  granulometria?: Partial<DadosAnalise['granulometria']>;
  calibracao?: RegressaoLinear | null;
}

export interface SalvarRascunhoApiResponse {
  sucesso: boolean;
  mensagem: string;
  dados: {
    protocolo: string;
    status: string;
    novaVersao: number;
    salvoEm: string;
  };
}

export interface ProcessarAnalisePayload {
  versaoEsperada: number;
  quimica: DadosAnalise['quimica'];
  granulometria: DadosAnalise['granulometria'];
  calibracao: RegressaoLinear;
}

export interface ProcessarAnaliseApiResponse {
  sucesso: boolean;
  mensagem: string;
  dados: {
    protocolo: string;
    status: string;
    novaVersao: number;
    calculosOficiais: {
      valoresLiquidos: Record<string, number>;
      conversoes: Record<string, number>;
      complexoSortivo: Record<string, unknown>;
      granulometria: Record<string, unknown>;
      fosforo: Record<string, number>;
    };
    processadoEm: string;
    processadoPor?: string | null;
  };
}

export interface CriarAmostraPayload {
  protocolo: string;
  cpf_cliente: string;
  cliente_nome: string;
  propriedade: string;
  localizacao?: string;
  areaIdentificacao?: string;
  areaHectares?: string;
  profundidadeColeta?: string;
  cultivo?: string;
  dataRecebimento: string;
  tipoAnalise: TipoAnalise;
  culturaExistente: string;
  email?: string;
  telefone?: string;
}

export interface CriarAmostraApiResponse {
  sucesso: boolean;
  mensagem: string;
  dados: {
    protocolo: string;
    cliente_nome: string;
    propriedade: string;
    status: string;
    versao: number;
    criadoEm: string;
  };
}

export interface HomologarLaudoPayload {
  versaoEsperada: number;
}

export interface HomologarLaudoApiResponse {
  sucesso: boolean;
  mensagem: string;
  dados: {
    protocolo: string;
    status: StatusLaudoServidor;
    novaVersao: number;
    homologadoEm: string;
    homologadoPor: string;
    temPdfDisponivel: boolean;
  };
}

export interface ItemListagemAmostra {
  protocolo: string;
  solicitante: string;
  propriedade: string;
  status: StatusLaudoServidor;
  dataRecebimento: string | null;
  prazo: string | null;
  atualizadoEm: string | null;
}

export interface ListarAmostrasParametros {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
  situacao?: 'pendentes' | 'concluidas';
  ordenacao?: string;
}

export interface ListarAmostrasApiResponse {
  sucesso: boolean;
  dados: {
    itens: ItemListagemAmostra[];
    total: number;
    pagina: number;
    tamanhoPagina: number;
  };
}

const caminhoLaudo = (protocolo: string) => `/laudos/${encodeURIComponent(protocolo)}`;

export const analiseService = {
  criarAmostra(payload: CriarAmostraPayload, token: string, signal?: AbortSignal) {
    return apiClient.request<CriarAmostraApiResponse>('/laudos', { method: 'POST', body: payload, token, signal });
  },

  listarAmostras(parametros: ListarAmostrasParametros, token: string, signal?: AbortSignal) {
    return apiClient.request<ListarAmostrasApiResponse>('/laudos', {
      token,
      signal,
      query: {
        pagina: parametros.pagina,
        tamanhoPagina: parametros.tamanhoPagina,
        busca: parametros.busca?.trim(),
        situacao: parametros.situacao,
        ordenacao: parametros.ordenacao,
      },
    });
  },

  obterAnalise(protocolo: string, token: string, signal?: AbortSignal) {
    return apiClient.request<ObterAnaliseApiResponse>(`${caminhoLaudo(protocolo)}/analise`, { token, signal });
  },

  salvarRascunho(protocolo: string, payload: SalvarRascunhoPayload, token: string, signal?: AbortSignal) {
    return apiClient.request<SalvarRascunhoApiResponse>(`${caminhoLaudo(protocolo)}/analise/rascunho`, {
      method: 'PATCH',
      body: payload,
      token,
      signal,
    });
  },

  processarAnalise(protocolo: string, payload: ProcessarAnalisePayload, token: string, signal?: AbortSignal) {
    return apiClient.request<ProcessarAnaliseApiResponse>(`${caminhoLaudo(protocolo)}/analise/processar`, {
      method: 'POST',
      body: payload,
      token,
      signal,
    });
  },

  homologarLaudo(protocolo: string, payload: HomologarLaudoPayload, token: string, signal?: AbortSignal) {
    return apiClient.request<HomologarLaudoApiResponse>(`${caminhoLaudo(protocolo)}/homologar`, {
      method: 'POST',
      body: payload,
      token,
      signal,
    });
  },
};
