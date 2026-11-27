function lerFlag(valor: string | undefined, padrao = false): boolean {
  const texto = (valor ?? '').trim().toLowerCase();
  if (!texto) return padrao;
  if (['0', 'false', 'nao', 'não', 'off'].includes(texto)) return false;
  return ['1', 'true', 'sim', 'on'].includes(texto);
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
  listagemAmostrasServidor: lerFlag(import.meta.env.VITE_FEATURE_LISTAGEM_SERVIDOR, false),
  homologacaoServidor: lerFlag(import.meta.env.VITE_FEATURE_HOMOLOGACAO_SERVIDOR, true),
  situacaoClienteServidor: lerFlag(import.meta.env.VITE_FEATURE_SITUACAO_CLIENTE, true),
} as const;

export const NOME_SISTEMA = 'Sistema de Laudos de Análise de Solo';

export const VERSAO_APP = typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : 'dev';
