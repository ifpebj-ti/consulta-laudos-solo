import { apiClient } from './apiClient';
import { normalizarProtocolo, somenteDigitos } from '@/lib/documentos';
import type { LoginClienteResponse, LoginGoogleResponse, UsuarioMeResponse } from '@/types/auth';

export const authService = {
  loginGoogle(idToken: string, signal?: AbortSignal) {
    return apiClient.request<LoginGoogleResponse>('/auth/google', {
      method: 'POST',
      body: { idToken },
      signal,
    });
  },

  loginCliente(protocolo: string, cpf: string, signal?: AbortSignal) {
    return apiClient.request<LoginClienteResponse>('/auth/cliente', {
      method: 'POST',
      body: { protocolo: normalizarProtocolo(protocolo), cpf: somenteDigitos(cpf) },
      signal,
    });
  },

  sessaoAtual(token: string, signal?: AbortSignal) {
    return apiClient.request<UsuarioMeResponse>('/auth/me', { token, signal });
  },
};
