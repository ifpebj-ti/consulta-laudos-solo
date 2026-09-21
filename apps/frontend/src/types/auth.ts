import type { LaudoDetalhe } from './laudo';

export type Role = 'ANALISTA' | 'CLIENTE';

export interface UsuarioAnalista {
  nome: string;
  email: string;
  role: 'ANALISTA';
}

export interface LoginGoogleResponse {
  sucesso: boolean;
  token: string;
  tipoToken: string;
  usuario: UsuarioAnalista;
}

export interface LoginClienteResponse {
  sucesso: boolean;
  token: string;
  tipoToken: string;
  laudo: LaudoDetalhe;
}

export interface UsuarioMeResponse {
  sub: string;
  role: Role;
  nome?: string;
  email?: string;
  protocolo?: string;
}

export interface ApiErrorBody {
  sucesso: false;
  mensagem: string;
  codigoErro?: string;
}
