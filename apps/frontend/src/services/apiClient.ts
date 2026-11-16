import type { ApiErrorBody } from '@/types/auth';
import { API_BASE_URL, TEMPO_LIMITE_REQUISICAO_MS } from '@/config/ambiente';

export type CodigoErroCliente = 'NETWORK_ERROR' | 'TIMEOUT' | 'ABORTED' | 'INVALID_RESPONSE';

export class ApiError extends Error {
  status: number;
  codigoErro?: string;
  erros?: string[];
  tentarAposSegundos?: number;

  constructor(status: number, mensagem: string, codigoErro?: string, erros?: string[]) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.codigoErro = codigoErro;
    this.erros = erros;
  }

  get foiCancelada(): boolean {
    return this.codigoErro === 'ABORTED';
  }
}

interface ErroValidacaoFastApi {
  loc: (string | number)[];
  msg: string;
}

type ManipuladorNaoAutorizado = (erro: ApiError) => void;

let manipuladorNaoAutorizado: ManipuladorNaoAutorizado | null = null;

export function registrarManipuladorNaoAutorizado(manipulador: ManipuladorNaoAutorizado | null): void {
  manipuladorNaoAutorizado = manipulador;
}

type VerificadorSessao = (token: string) => boolean;

let verificadorSessao: VerificadorSessao | null = null;

export const MENSAGEM_SESSAO_ENCERRADA = 'Sua sessão foi encerrada. Entre novamente para continuar.';

export function registrarVerificadorSessao(verificador: VerificadorSessao | null): void {
  verificadorSessao = verificador;
}

function garantirSessaoAtiva(token: string | undefined) {
  if (token && verificadorSessao && !verificadorSessao(token)) {
    throw new ApiError(401, MENSAGEM_SESSAO_ENCERRADA, 'SESSAO_ENCERRADA');
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export const MENSAGENS_PADRAO: Record<number, string> = {
  0: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  400: 'A solicitação não pôde ser processada. Confira os dados informados.',
  401: 'Sua sessão expirou. Entre novamente para continuar.',
  403: 'Você não tem permissão para acessar este recurso.',
  404: 'O recurso solicitado não foi encontrado.',
  409: 'Os dados foram alterados por outra pessoa. Recarregue para ver a versão mais recente.',
  413: 'O conteúdo enviado é grande demais.',
  422: 'Alguns campos enviados são inválidos.',
  429: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.',
  500: 'O servidor encontrou um erro inesperado. Tente novamente em instantes.',
  502: 'O servidor está temporariamente indisponível. Tente novamente em instantes.',
  503: 'O servidor está temporariamente indisponível. Tente novamente em instantes.',
  504: 'O servidor demorou para responder. Tente novamente em instantes.',
};

export function mensagemPadrao(status: number): string {
  if (MENSAGENS_PADRAO[status]) return MENSAGENS_PADRAO[status];
  if (status >= 500) return MENSAGENS_PADRAO[500];
  return 'Não foi possível concluir a solicitação.';
}

function montarUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const parametros = new URLSearchParams();
  Object.entries(query).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(chave, String(valor));
  });
  const serializado = parametros.toString();
  return serializado ? `${url}?${serializado}` : url;
}

function combinarSinais(externo: AbortSignal | undefined, timeoutMs: number) {
  const controlador = new AbortController();
  let estourouTempo = false;
  const temporizador = setTimeout(() => {
    estourouTempo = true;
    controlador.abort();
  }, timeoutMs);
  const repassarCancelamento = () => controlador.abort();
  if (externo) {
    if (externo.aborted) controlador.abort();
    else externo.addEventListener('abort', repassarCancelamento, { once: true });
  }
  return {
    signal: controlador.signal,
    estourouTempo: () => estourouTempo,
    liberar: () => {
      clearTimeout(temporizador);
      externo?.removeEventListener('abort', repassarCancelamento);
    },
  };
}

async function executar(url: string, init: RequestInit, signal: AbortSignal | undefined, timeoutMs: number) {
  const sinais = combinarSinais(signal, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: sinais.signal });
  } catch (erro) {
    if (sinais.estourouTempo()) {
      throw new ApiError(0, 'O servidor demorou demais para responder. Tente novamente.', 'TIMEOUT');
    }
    if (signal?.aborted || (erro instanceof DOMException && erro.name === 'AbortError')) {
      throw new ApiError(0, 'A solicitação foi cancelada.', 'ABORTED');
    }
    throw new ApiError(0, MENSAGENS_PADRAO[0], 'NETWORK_ERROR');
  } finally {
    sinais.liberar();
  }
}

function extrairErros(detalhe: ErroValidacaoFastApi[]): string[] {
  return detalhe.map((item) => {
    const caminho = (item.loc ?? []).filter((parte) => parte !== 'body').join('.');
    return caminho ? `${caminho}: ${item.msg}` : item.msg;
  });
}

export async function interpretarFalha(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? '';
  let erro: ApiError;

  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: ApiErrorBody | ErroValidacaoFastApi[] | string; error?: string }
      | ApiErrorBody
      | null;
    const detalhe = payload && 'detail' in payload ? payload.detail : undefined;

    if (Array.isArray(detalhe)) {
      erro = new ApiError(response.status, mensagemPadrao(422), 'VALIDATION_ERROR', extrairErros(detalhe));
    } else if (detalhe && typeof detalhe === 'object' && 'mensagem' in detalhe && detalhe.mensagem) {
      erro = new ApiError(response.status, detalhe.mensagem, detalhe.codigoErro, detalhe.erros);
    } else if (payload && 'mensagem' in payload && payload.mensagem) {
      erro = new ApiError(response.status, payload.mensagem, payload.codigoErro, payload.erros);
    } else {
      erro = new ApiError(response.status, mensagemPadrao(response.status));
    }
  } else {
    erro = new ApiError(response.status, mensagemPadrao(response.status));
  }

  if (response.status === 429 || response.status >= 500) {
    erro.message = mensagemPadrao(response.status);
  }

  const espera = segundosParaTentarNovamente(response.headers.get('retry-after'));
  if (espera) {
    erro.tentarAposSegundos = espera;
    if (response.status === 429) erro.message = mensagemLimiteRequisicoes(espera);
  }

  return erro;
}

export function segundosParaTentarNovamente(valor: string | null, agora = Date.now()): number | undefined {
  if (!valor || !valor.trim()) return undefined;
  const segundos = Number(valor.trim());
  if (Number.isFinite(segundos)) return segundos > 0 ? Math.ceil(segundos) : undefined;
  const data = Date.parse(valor);
  if (Number.isNaN(data)) return undefined;
  const restante = Math.ceil((data - agora) / 1000);
  return restante > 0 ? restante : undefined;
}

export function mensagemLimiteRequisicoes(segundos: number): string {
  return `Muitas tentativas em pouco tempo. Aguarde ${segundos} segundo${segundos > 1 ? 's' : ''} e tente novamente.`;
}

export function ehConflitoDeVersao(erro: unknown): boolean {
  return erro instanceof ApiError && (erro.status === 409 || erro.status === 412);
}

function notificarSeNaoAutorizado(erro: ApiError, token?: string) {
  if (erro.status === 401 && token && manipuladorNaoAutorizado) manipuladorNaoAutorizado(erro);
}

async function request<T>(
  path: string,
  { method = 'GET', body, token, signal, timeoutMs = TEMPO_LIMITE_REQUISICAO_MS, query }: RequestOptions = {},
): Promise<T> {
  garantirSessaoAtiva(token);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await executar(
    montarUrl(path, query),
    { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined },
    signal,
    timeoutMs,
  );

  if (!response.ok) {
    const erro = await interpretarFalha(response);
    notificarSeNaoAutorizado(erro, token);
    throw erro;
  }

  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, 'O servidor enviou uma resposta inválida.', 'INVALID_RESPONSE');
  }
}

export interface ArquivoBaixado {
  blob: Blob;
  nomeArquivo: string | null;
  tipo: string;
  inicio: string;
}

const BYTES_INICIAIS_ARQUIVO = 1024;

export function extrairNomeArquivo(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8 = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(contentDisposition);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
    } catch {
      return null;
    }
  }
  const simples = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(contentDisposition);
  if (!simples) return null;
  const nome = (simples[2] ?? simples[1]).trim();
  return nome || null;
}

async function requestArquivo(
  path: string,
  {
    token,
    signal,
    timeoutMs = TEMPO_LIMITE_REQUISICAO_MS,
    tiposAceitos,
  }: { token: string; signal?: AbortSignal; timeoutMs?: number; tiposAceitos: string[] },
): Promise<ArquivoBaixado> {
  garantirSessaoAtiva(token);
  const response = await executar(
    montarUrl(path),
    { headers: { Authorization: `Bearer ${token}`, Accept: tiposAceitos.join(', ') } },
    signal,
    timeoutMs,
  );

  if (!response.ok) {
    const erro = await interpretarFalha(response);
    notificarSeNaoAutorizado(erro, token);
    throw erro;
  }

  const tipo = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!tiposAceitos.includes(tipo)) {
    throw new ApiError(response.status, 'O servidor enviou um arquivo em formato inesperado.', 'INVALID_RESPONSE');
  }

  const conteudo = new Uint8Array(await response.arrayBuffer());
  if (conteudo.byteLength === 0) {
    throw new ApiError(response.status, 'O servidor enviou um arquivo vazio.', 'INVALID_RESPONSE');
  }

  return {
    blob: new Blob([conteudo], { type: tipo }),
    tipo,
    inicio: String.fromCharCode(...conteudo.subarray(0, BYTES_INICIAIS_ARQUIVO)),
    nomeArquivo: extrairNomeArquivo(response.headers.get('content-disposition')),
  };
}

export const apiClient = { request, requestArquivo };
