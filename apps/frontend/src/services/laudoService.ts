import { apiClient, ApiError, mensagemLimiteRequisicoes } from './apiClient';
import { normalizarSituacaoLaudo } from './respostasApi';
import { TEMPO_LIMITE_DOWNLOAD_MS } from '@/config/ambiente';
import { nomeArquivoSeguro, salvarArquivo } from '@/lib/download';
import type { LaudoDetalhe } from '@/types/laudo';

export type MotivoFalhaPdf =
  | 'indisponivel'
  | 'sem_conexao'
  | 'sessao_expirada'
  | 'sem_permissao'
  | 'limite_requisicoes'
  | 'servidor'
  | 'rede'
  | 'formato_invalido'
  | 'cancelado'
  | 'desconhecido';

export interface FalhaPdf {
  motivo: MotivoFalhaPdf;
  mensagem: string;
  podeTentarNovamente: boolean;
}

const MENSAGENS_FALHA_PDF: Record<MotivoFalhaPdf, string> = {
  sem_conexao: 'Você está sem conexão com a internet. Conecte-se e tente novamente.',
  indisponivel: 'O PDF deste laudo ainda não está disponível. Ele é liberado assim que o laboratório concluir a emissão.',
  sessao_expirada: 'Sua sessão expirou. Consulte o laudo novamente para baixar o PDF.',
  sem_permissao: 'Você não tem permissão para baixar o PDF deste laudo.',
  limite_requisicoes: 'Muitas tentativas de download em pouco tempo. Aguarde um minuto e tente novamente.',
  servidor: 'O servidor não conseguiu gerar o PDF agora. Tente novamente em instantes.',
  rede: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  formato_invalido: 'O arquivo recebido não é um PDF válido. Tente novamente ou procure o laboratório.',
  cancelado: 'O download foi cancelado.',
  desconhecido: 'Não foi possível baixar o PDF agora. Tente novamente.',
};

export function classificarFalhaPdf(erro: unknown): FalhaPdf {
  let motivo: MotivoFalhaPdf = 'desconhecido';
  if (erro instanceof ApiError) {
    if (erro.codigoErro === 'ABORTED') motivo = 'cancelado';
    else if (erro.codigoErro === 'NETWORK_ERROR' && typeof navigator !== 'undefined' && navigator.onLine === false) motivo = 'sem_conexao';
    else if (erro.codigoErro === 'NETWORK_ERROR' || erro.codigoErro === 'TIMEOUT') motivo = 'rede';
    else if (erro.codigoErro === 'INVALID_RESPONSE') motivo = 'formato_invalido';
    else if (erro.status === 404 || erro.status === 409 || erro.status === 425) motivo = 'indisponivel';
    else if (erro.status === 401) motivo = 'sessao_expirada';
    else if (erro.status === 403) motivo = 'sem_permissao';
    else if (erro.status === 429) motivo = 'limite_requisicoes';
    else if (erro.status >= 500) motivo = 'servidor';
  }
  const espera = erro instanceof ApiError ? erro.tentarAposSegundos : undefined;
  const mensagem =
    motivo === 'limite_requisicoes' && espera ? mensagemLimiteRequisicoes(espera) : MENSAGENS_FALHA_PDF[motivo];
  return {
    motivo,
    mensagem,
    podeTentarNovamente: !['sessao_expirada', 'sem_permissao', 'cancelado'].includes(motivo),
  };
}

export function nomePadraoPdf(protocolo: string): string {
  return nomeArquivoSeguro(`laudo-${protocolo}`, 'pdf');
}

const ASSINATURA_PDF = '%PDF';

export function temAssinaturaPdf(inicioDoArquivo: string): boolean {
  return inicioDoArquivo.includes(ASSINATURA_PDF);
}

export interface SituacaoLaudoApiResponse {
  sucesso: boolean;
  laudo: LaudoDetalhe;
}

export const laudoService = {
  async consultarSituacao(protocolo: string, token: string, signal?: AbortSignal): Promise<SituacaoLaudoApiResponse> {
    const resposta = await apiClient.request<unknown>(`/laudos/${encodeURIComponent(protocolo)}`, { token, signal });
    return normalizarSituacaoLaudo(resposta);
  },

  async obterPdf(protocolo: string, token: string, signal?: AbortSignal) {
    const arquivo = await apiClient.requestArquivo(`/laudos/${encodeURIComponent(protocolo)}/pdf`, {
      token,
      signal,
      timeoutMs: TEMPO_LIMITE_DOWNLOAD_MS,
      tiposAceitos: ['application/pdf'],
    });
    if (!temAssinaturaPdf(arquivo.inicio)) {
      throw new ApiError(200, 'O servidor enviou um arquivo que não é um PDF.', 'INVALID_RESPONSE');
    }
    return {
      blob: arquivo.blob,
      nomeArquivo: arquivo.nomeArquivo ? nomeArquivoSeguro(arquivo.nomeArquivo, 'pdf') : nomePadraoPdf(protocolo),
    };
  },

  async baixarPdf(protocolo: string, token: string, signal?: AbortSignal): Promise<string> {
    const { blob, nomeArquivo } = await laudoService.obterPdf(protocolo, token, signal);
    salvarArquivo(blob, nomeArquivo);
    return nomeArquivo;
  },
};
