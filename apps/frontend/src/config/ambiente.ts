function lerFlag(valor: string | undefined): boolean {
  return ['1', 'true', 'sim', 'on'].includes((valor ?? '').trim().toLowerCase());
}

function removerBarraFinal(url: string): string {
  return url.replace(/\/+$/, '');
}

const API_PADRAO = import.meta.env.DEV ? 'http://localhost:8080/api' : '/api';

export const API_BASE_URL = removerBarraFinal(import.meta.env.VITE_API_BASE_URL || API_PADRAO);

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export const TEMPO_LIMITE_REQUISICAO_MS = 20_000;

export const TEMPO_LIMITE_DOWNLOAD_MS = 60_000;

export const INTERVALO_ATUALIZACAO_SITUACAO_MS = 60_000;

export const FUNCIONALIDADES = {
  listagemAmostrasServidor: lerFlag(import.meta.env.VITE_FEATURE_LISTAGEM_SERVIDOR),
  homologacaoServidor: lerFlag(import.meta.env.VITE_FEATURE_HOMOLOGACAO_SERVIDOR),
  situacaoClienteServidor: lerFlag(import.meta.env.VITE_FEATURE_SITUACAO_CLIENTE),
} as const;

export const NOME_SISTEMA = 'Sistema de Laudos de Análise de Solo';
