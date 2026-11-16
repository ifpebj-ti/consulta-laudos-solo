import { apiClient } from './apiClient';
import type {
  AnalistaPrincipalItem,
  AuxiliarItem,
  ListarAnalistasResponse,
  ListarAuxiliaresResponse,
  LoginClienteResponse,
  LoginGoogleResponse,
} from '@/types/auth';

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export const authService = {
  loginLocal(username: string, password: string) {
    return apiClient.request<LoginGoogleResponse>('/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
    });
  },

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

  listarAnalistasPrincipais(token: string) {
    return apiClient.request<ListarAnalistasResponse>('/usuarios/analistas', {
      method: 'GET',
      token,
    });
  },

  criarAnalistaPrincipal(payload: { nome: string; email: string; crea: string }, token: string) {
    return apiClient.request<AnalistaPrincipalItem>('/usuarios/analistas', {
      method: 'POST',
      body: payload,
      token,
    });
  },

  removerAnalistaPrincipal(id: string, token: string) {
    return apiClient.request<{ sucesso: boolean; mensagem: string }>(`/usuarios/analistas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      token,
    });
  },

  listarAuxiliares(token: string) {
    return apiClient.request<ListarAuxiliaresResponse>('/usuarios/auxiliares', {
      method: 'GET',
      token,
    });
  },

  criarAuxiliar(payload: { nome: string; email: string }, token: string) {
    return apiClient.request<AuxiliarItem>('/usuarios/auxiliares', {
      method: 'POST',
      body: payload,
      token,
    });
  },

  removerAuxiliar(id: string, token: string) {
    return apiClient.request<{ sucesso: boolean; mensagem: string }>(`/usuarios/auxiliares/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      token,
    });
  },
};
