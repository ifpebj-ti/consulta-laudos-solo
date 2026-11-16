import { apiClient } from './apiClient';
import { normalizarLoginCliente, normalizarLoginGoogle } from './respostasApi';
import { normalizarProtocolo, somenteDigitos } from '@/lib/documentos';
import type { LoginClienteResponse, LoginGoogleResponse, UsuarioMeResponse } from '@/types/auth';

export const authService = {
  async loginGoogle(idToken: string, signal?: AbortSignal): Promise<LoginGoogleResponse> {
    const resposta = await apiClient.request<unknown>('/auth/google', {
      method: 'POST',
      body: { idToken },
      signal,
    });
    return normalizarLoginGoogle(resposta);
  },

  async loginCliente(protocolo: string, cpf: string, signal?: AbortSignal): Promise<LoginClienteResponse> {
    const resposta = await apiClient.request<unknown>('/auth/cliente', {
      method: 'POST',
      body: { protocolo: normalizarProtocolo(protocolo), cpf: somenteDigitos(cpf) },
      signal,
    });
    return normalizarLoginCliente(resposta);
  },

  sessaoAtual(token: string, signal?: AbortSignal) {
    return apiClient.request<UsuarioMeResponse>('/auth/me', { token, signal });
  },
};
