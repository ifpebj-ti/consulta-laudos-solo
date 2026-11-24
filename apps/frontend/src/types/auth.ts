import type { LaudoDetalhe } from './laudo';

export type Role = 'POWER_USER' | 'ANALISTA' | 'AUXILIAR' | 'CLIENTE';

export interface UsuarioAnalista {
  id?: string;
  nome: string;
  email: string;
  role: 'POWER_USER' | 'ANALISTA' | 'AUXILIAR';
  crea?: string | null;
  escopoAnalistaId?: string | null;
  responsavelNome?: string | null;
  responsavelCrea?: string | null;
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
  crea?: string | null;
  escopoAnalistaId?: string | null;
  responsavelNome?: string | null;
  responsavelCrea?: string | null;
  protocolo?: string;
}

export interface AuxiliarItem {
  id: string;
  nome: string;
  email: string;
  criadoEm: string;
}

export interface AnalistaPrincipalItem {
  id: string;
  nome: string;
  email: string;
  crea: string;
  criadoEm: string;
  auxiliares: AuxiliarItem[];
}

export interface ListarAnalistasResponse {
  sucesso: boolean;
  dados: AnalistaPrincipalItem[];
}

export interface ListarAuxiliaresResponse {
  sucesso: boolean;
  dados: AuxiliarItem[];
}

export interface ApiErrorBody {
  sucesso: false;
  mensagem: string;
  codigoErro?: string;
  erros?: string[];
}
