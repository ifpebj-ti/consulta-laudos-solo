import { ApiError } from './apiClient';
import type { LaudoDetalhe, ParametrosSolo } from '@/types/laudo';
import type { LoginClienteResponse, LoginGoogleResponse } from '@/types/auth';

export const MENSAGEM_RESPOSTA_INVALIDA = 'O servidor enviou uma resposta inválida.';

export function respostaInvalida(): ApiError {
  return new ApiError(200, MENSAGEM_RESPOSTA_INVALIDA, 'INVALID_RESPONSE');
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export function textoOuNulo(valor: unknown): string | null {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return null;
}

export function numeroOuNulo(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string' && valor.trim()) {
    const convertido = Number(valor.trim().replace(',', '.'));
    return Number.isFinite(convertido) ? convertido : null;
  }
  return null;
}

export function mascararCpfExibicao(valor: string | null): string {
  if (!valor) return '';
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length >= 11) return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
  if (digitos.length > 6) return '***.***.***-**';
  return valor;
}

export function normalizarLaudo(bruto: unknown): LaudoDetalhe {
  if (!ehObjeto(bruto)) throw respostaInvalida();
  const protocolo = textoOuNulo(bruto.protocolo)?.trim();
  if (!protocolo) throw respostaInvalida();
  const cliente = ehObjeto(bruto.cliente) ? bruto.cliente : {};
  return {
    protocolo,
    status: textoOuNulo(bruto.status) ?? '',
    cliente: {
      nome: textoOuNulo(cliente.nome) ?? '',
      cpfMascarado: mascararCpfExibicao(textoOuNulo(cliente.cpfMascarado)),
    },
    propriedade: textoOuNulo(bruto.propriedade),
    dataEmissao: textoOuNulo(bruto.dataEmissao),
    parametrosSolo: ehObjeto(bruto.parametrosSolo) ? (bruto.parametrosSolo as ParametrosSolo) : null,
    temPdfDisponivel: bruto.temPdfDisponivel === true,
    dataPrevistaEntrega: textoOuNulo(bruto.dataPrevistaEntrega),
    versao: numeroOuNulo(bruto.versao),
    atualizadoEm: textoOuNulo(bruto.atualizadoEm),
  };
}

function tokenValido(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) throw respostaInvalida();
  return valor.trim();
}

export function normalizarLoginCliente(bruto: unknown): LoginClienteResponse {
  if (!ehObjeto(bruto)) throw respostaInvalida();
  return {
    sucesso: true,
    token: tokenValido(bruto.token),
    tipoToken: textoOuNulo(bruto.tipoToken) ?? 'bearer',
    laudo: normalizarLaudo(bruto.laudo),
  };
}

export function normalizarLoginGoogle(bruto: unknown): LoginGoogleResponse {
  if (!ehObjeto(bruto)) throw respostaInvalida();
  const usuario = ehObjeto(bruto.usuario) ? bruto.usuario : {};
  return {
    sucesso: true,
    token: tokenValido(bruto.token),
    tipoToken: textoOuNulo(bruto.tipoToken) ?? 'bearer',
    usuario: {
      nome: textoOuNulo(usuario.nome) ?? '',
      email: textoOuNulo(usuario.email) ?? '',
      role: 'ANALISTA',
    },
  };
}

export function normalizarSituacaoLaudo(bruto: unknown): { sucesso: boolean; laudo: LaudoDetalhe } {
  if (!ehObjeto(bruto)) throw respostaInvalida();
  return { sucesso: true, laudo: normalizarLaudo(bruto.laudo) };
}
