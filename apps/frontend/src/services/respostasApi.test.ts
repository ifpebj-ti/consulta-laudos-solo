import { describe, expect, it } from 'vitest';
import { ApiError } from './apiClient';
import {
  normalizarLaudo,
  normalizarLoginCliente,
  normalizarLoginGoogle,
  normalizarSituacaoLaudo,
  numeroOuNulo,
} from './respostasApi';

function erroDe(funcao: () => unknown): ApiError {
  try {
    funcao();
  } catch (erro) {
    if (erro instanceof ApiError) return erro;
    throw erro;
  }
  throw new Error('Deveria ter falhado.');
}

describe('normalizarLaudo', () => {
  it('converte tipos errados vindos do servidor sem quebrar a tela', () => {
    const laudo = normalizarLaudo({
      protocolo: 20101,
      status: 3,
      cliente: { nome: 42, cpfMascarado: { a: 1 } },
      propriedade: { nome: 'x' },
      dataEmissao: 12345,
      temPdfDisponivel: 'true',
      versao: '2',
      dataPrevistaEntrega: true,
    });
    expect(laudo).toEqual({
      protocolo: '20101',
      status: '3',
      cliente: { nome: '42', cpfMascarado: '' },
      propriedade: null,
      dataEmissao: '12345',
      parametrosSolo: null,
      temPdfDisponivel: false,
      dataPrevistaEntrega: null,
      versao: 2,
      atualizadoEm: null,
    });
  });

  it('aceita cliente nulo e campos ausentes', () => {
    const laudo = normalizarLaudo({ protocolo: '20101.2306', status: 'EM_ANALISE', cliente: null });
    expect(laudo.cliente).toEqual({ nome: '', cpfMascarado: '' });
    expect(laudo.temPdfDisponivel).toBe(false);
  });

  it('recusa laudo ausente ou sem protocolo', () => {
    expect(erroDe(() => normalizarLaudo(null)).codigoErro).toBe('INVALID_RESPONSE');
    expect(erroDe(() => normalizarLaudo({ status: 'CONCLUIDO' })).codigoErro).toBe('INVALID_RESPONSE');
    expect(erroDe(() => normalizarLaudo([])).message).toBe('O servidor enviou uma resposta inválida.');
  });
});

describe('respostas de login', () => {
  it('consulta do cliente sem token é resposta inválida', () => {
    expect(erroDe(() => normalizarLoginCliente({ sucesso: true, laudo: { protocolo: '1', status: 'CONCLUIDO' } })).codigoErro).toBe(
      'INVALID_RESPONSE',
    );
  });

  it('consulta do cliente sem laudo é resposta inválida', () => {
    expect(erroDe(() => normalizarLoginCliente({ sucesso: true, token: 'abc', laudo: null })).codigoErro).toBe('INVALID_RESPONSE');
  });

  it('login do analista sem token é resposta inválida e sem usuário fica com nome vazio', () => {
    expect(erroDe(() => normalizarLoginGoogle({ sucesso: true, usuario: { nome: 'X' } })).codigoErro).toBe('INVALID_RESPONSE');
    expect(normalizarLoginGoogle({ token: 'abc.def.ghi' }).usuario).toEqual({ nome: '', email: '', role: 'ANALISTA' });
  });
});

describe('normalizarSituacaoLaudo', () => {
  it('resposta sem laudo é inválida em vez de apagar o laudo da sessão', () => {
    expect(erroDe(() => normalizarSituacaoLaudo({ sucesso: true })).codigoErro).toBe('INVALID_RESPONSE');
  });
});

describe('numeroOuNulo', () => {
  it.each([
    [6.5, 6.5],
    ['6.5', 6.5],
    ['6,5', 6.5],
    ['', null],
    ['abc', null],
    [null, null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
  ])('%s vira %s', (entrada, esperado) => {
    expect(numeroOuNulo(entrada)).toBe(esperado);
  });
});
