import type { ApiErrorBody } from '@/types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export class ApiError extends Error {
  status: number;
  codigoErro?: string;

  constructor(status: number, mensagem: string, codigoErro?: string) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.codigoErro = codigoErro;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
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
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { detail?: ApiErrorBody } | ApiErrorBody;
      const erro = 'detail' in payload && payload.detail ? payload.detail : (payload as ApiErrorBody);
      throw new ApiError(response.status, erro.mensagem ?? 'Erro inesperado.', erro.codigoErro);
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
    const payload = (await response.json().catch(() => null)) as { detail?: ApiErrorBody } | null;
    const mensagem = payload?.detail?.mensagem ?? 'Não foi possível baixar o arquivo.';
    throw new ApiError(response.status, mensagem, payload?.detail?.codigoErro);
  }

  return response.blob();
}

export const apiClient = { request, requestBlob };
