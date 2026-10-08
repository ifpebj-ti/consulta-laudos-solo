import { apiClient } from './apiClient';
import type { DadosAnalise, TipoAnalise } from '@/features/laudos/analista/tipos';
import type { RegressaoLinear } from '@/features/laudos/analista/calculos';

export interface AmostraMetadata {
  solicitante: string;
  propriedade: string;
  dataColeta?: string;
}

export interface ObterAnaliseApiResponse {
  sucesso: boolean;
  dados: {
    protocolo: string;
    status: string;
    versao: number;
    amostra: AmostraMetadata;
    dadosBancada: {
      quimica: DadosAnalise['quimica'];
      granulometria: DadosAnalise['granulometria'];
      calibracao: RegressaoLinear | null;
    };
    atualizadoEm?: string;
    atualizadoPor?: string;
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
      complexoSortivo: Record<string, any>;
      granulometria: Record<string, any>;
      fosforo: Record<string, number>;
    };
    processadoEm: string;
    processadoPor?: string;
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

export const analiseService = {
  async criarAmostra(payload: CriarAmostraPayload, token: string): Promise<CriarAmostraApiResponse> {
    return apiClient.request<CriarAmostraApiResponse>('/laudos', {
      method: 'POST',
      body: payload,
      token,
    });
  },

  async obterAnalise(protocolo: string, token: string): Promise<ObterAnaliseApiResponse> {
    return apiClient.request<ObterAnaliseApiResponse>(`/laudos/${encodeURIComponent(protocolo)}/analise`, {
      method: 'GET',
      token,
    });
  },

  async salvarRascunho(
    protocolo: string,
    payload: SalvarRascunhoPayload,
    token: string,
  ): Promise<SalvarRascunhoApiResponse> {
    return apiClient.request<SalvarRascunhoApiResponse>(
      `/laudos/${encodeURIComponent(protocolo)}/analise/rascunho`,
      {
        method: 'PATCH',
        body: payload,
        token,
      },
    );
  },

  async processarAnalise(
    protocolo: string,
    payload: ProcessarAnalisePayload,
    token: string,
  ): Promise<ProcessarAnaliseApiResponse> {
    return apiClient.request<ProcessarAnaliseApiResponse>(
      `/laudos/${encodeURIComponent(protocolo)}/analise/processar`,
      {
        method: 'POST',
        body: payload,
        token,
      },
    );
  },
};

