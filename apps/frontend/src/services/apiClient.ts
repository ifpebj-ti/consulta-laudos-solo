import type { ApiErrorBody } from '@/types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export class ApiError extends Error {
  status: number;
  codigoErro?: string;
  erros?: string[];

  constructor(status: number, mensagem: string, codigoErro?: string, erros?: string[]) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.codigoErro = codigoErro;
    this.erros = erros;
  }
}

interface ErroValidacaoFastApi {
  loc: (string | number)[];
  msg: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

/**
 * Callback para tratamento global de sessão expirada (401).
 * Registrado pelo AuthProvider para limpar sessão e redirecionar para login.
 */
let onUnauthorized: (() => void) | null = null;

export function registrarCallbackSessaoExpirada(callback: () => void): void {
  onUnauthorized = callback;
}

async function request<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Interceptor 401: sessão expirada — limpa a sessão e redireciona para login
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      throw new ApiError(401, 'Sessão expirada. Por favor, faça login novamente.', 'SESSION_EXPIRED');
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { detail?: ApiErrorBody | ErroValidacaoFastApi[] } | ApiErrorBody;
      const detalhe = 'detail' in payload ? payload.detail : undefined;

      if (Array.isArray(detalhe)) {
        const erros = detalhe.map((item) => `${item.loc.filter((p) => p !== 'body').join('.')}: ${item.msg}`);
        throw new ApiError(response.status, 'Alguns campos enviados são inválidos.', 'VALIDATION_ERROR', erros);
      }

      const erro = detalhe ?? (payload as ApiErrorBody);
      throw new ApiError(response.status, erro.mensagem ?? 'Erro inesperado.', erro.codigoErro, erro.erros);
    }
    throw new ApiError(response.status, 'Erro inesperado ao comunicar com o servidor.');
  }

  return (await response.json()) as T;
}

async function requestBlob(path: string, token: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      throw new ApiError(401, 'Sessão expirada. Por favor, faça login novamente.', 'SESSION_EXPIRED');
    }

    const payload = (await response.json().catch(() => null)) as { detail?: ApiErrorBody } | null;
    const mensagem = payload?.detail?.mensagem ?? 'Não foi possível baixar o arquivo.';
    throw new ApiError(response.status, mensagem, payload?.detail?.codigoErro);
  }

  return response.blob();
}

export const apiClient = { request, requestBlob };
