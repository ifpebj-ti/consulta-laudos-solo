import { apiClient } from './apiClient';
import { normalizarLoginCliente, normalizarLoginGoogle } from './respostasApi';
import { normalizarProtocolo, somenteDigitos } from '@/lib/documentos';
import type {
  AnalistaPrincipalItem,
  AuxiliarItem,
  ListarAnalistasResponse,
  ListarAuxiliaresResponse,
  LoginClienteResponse,
  LoginGoogleResponse,
  UsuarioMeResponse,
} from '@/types/auth';

export const authService = {
  async loginLocal(username: string, password: string, signal?: AbortSignal): Promise<LoginGoogleResponse> {
    const resposta = await apiClient.request<unknown>('/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
      signal,
    });
    return normalizarLoginGoogle(resposta);
  },

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

  listarAnalistasPrincipais(token: string, signal?: AbortSignal) {
    return apiClient.request<ListarAnalistasResponse>('/usuarios/analistas', {
      method: 'GET',
      token,
      signal,
    });
  },

  criarAnalistaPrincipal(payload: { nome: string; email: string; crea: string }, token: string, signal?: AbortSignal) {
    return apiClient.request<AnalistaPrincipalItem>('/usuarios/analistas', {
      method: 'POST',
      body: payload,
      token,
      signal,
    });
  },

  removerAnalistaPrincipal(id: string, token: string, signal?: AbortSignal) {
    return apiClient.request<{ sucesso: boolean; mensagem: string }>(`/usuarios/analistas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      token,
      signal,
    });
  },

  listarAuxiliares(token: string, signal?: AbortSignal) {
    return apiClient.request<ListarAuxiliaresResponse>('/usuarios/auxiliares', {
      method: 'GET',
      token,
      signal,
    });
  },

  criarAuxiliar(payload: { nome: string; email: string }, token: string, signal?: AbortSignal) {
    return apiClient.request<AuxiliarItem>('/usuarios/auxiliares', {
      method: 'POST',
      body: payload,
      token,
      signal,
    });
  },

  removerAuxiliar(id: string, token: string, signal?: AbortSignal) {
    return apiClient.request<{ sucesso: boolean; mensagem: string }>(`/usuarios/auxiliares/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      token,
      signal,
    });
  },
};
