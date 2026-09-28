import { apiClient } from './apiClient';
import type { LoginClienteResponse, LoginGoogleResponse } from '@/types/auth';

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export const authService = {
  loginGoogle(idToken: string) {
    return apiClient.request<LoginGoogleResponse>('/auth/google', {
      method: 'POST',
      body: { idToken },
    });
  },

  loginCliente(protocolo: string, cpf: string) {
    return apiClient.request<LoginClienteResponse>('/auth/cliente', {
      method: 'POST',
      body: { protocolo: protocolo.trim(), cpf: normalizarCpf(cpf) },
    });
  },
};
