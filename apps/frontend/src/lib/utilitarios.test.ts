import { describe, expect, it } from 'vitest';
import { expiracaoDoToken, tokenExpirado } from './token';
import { infoStatusLaudo, laudoConcluido, normalizarStatusLaudo } from './statusLaudo';
import { formatarDataHoraServidor } from './datas';
import { nomeArquivoSeguro } from './download';
import { destinoAposLogin } from '@/routes/rotas';
import { tokenComExpiracao } from '@/test/utilitarios';

describe('token', () => {
  it('lê a expiração do JWT e detecta token vencido', () => {
    expect(tokenExpirado(tokenComExpiracao(60))).toBe(false);
    expect(tokenExpirado(tokenComExpiracao(-60))).toBe(true);
    expect(expiracaoDoToken('nao-e-jwt')).toBeNull();
    expect(tokenExpirado('nao-e-jwt')).toBe(false);
  });
});

describe('status do laudo', () => {
  it('normaliza os status do servidor', () => {
    expect(normalizarStatusLaudo('concluido')).toBe('CONCLUIDO');
    expect(normalizarStatusLaudo('AGUARDANDO_HOMOLOGACAO')).toBe('AGUARDANDO_HOMOLOGACAO');
    expect(normalizarStatusLaudo('desconhecido')).toBeNull();
    expect(laudoConcluido('CONCLUIDO')).toBe(true);
    expect(infoStatusLaudo('EM_ANALISE').rotulo).toBe('Em análise');
    expect(infoStatusLaudo('NOVO_STATUS').rotulo).toBe('Situação em atualização');
    expect(infoStatusLaudo('NOVO_STATUS').permiteDownload).toBe(false);
    expect(infoStatusLaudo(null).categoria).toBe('desconhecido');
    expect(normalizarStatusLaudo('recusado')).toBe('CANCELADO');
    expect(normalizarStatusLaudo('Amostra inadequada')).toBe('PENDENCIA');
    expect(normalizarStatusLaudo('recoleta-solicitada')).toBe('RECOLETA');
    expect(infoStatusLaudo('EM_ANALISE').etapaAtual).toBe(1);
    expect(infoStatusLaudo('CANCELADO').etapaAtual).toBeNull();
  });
});

describe('datas', () => {
  it('formata no fuso do laboratório e trata valores inválidos', () => {
    expect(formatarDataHoraServidor('2026-09-01T02:00:00Z')).toBe('31/08/2026');
    expect(formatarDataHoraServidor('invalida')).toBe('—');
    expect(formatarDataHoraServidor(null)).toBe('—');
  });
});

describe('download', () => {
  it('gera nomes de arquivo seguros', () => {
    expect(nomeArquivoSeguro('Laudo Técnico/2026', 'pdf')).toBe('Laudo-Tecnico-2026.pdf');
    expect(nomeArquivoSeguro('laudo.pdf', 'pdf')).toBe('laudo.pdf');
    expect(nomeArquivoSeguro('***', 'pdf')).toBe('arquivo.pdf');
  });
});

describe('redirecionamento após login', () => {
  it('só aceita destinos internos com o prefixo esperado', () => {
    expect(destinoAposLogin({ de: '/analista/analises/X' }, '/analista', '/analista')).toBe('/analista/analises/X');
    expect(destinoAposLogin({ de: '//evil.com' }, '/analista', '/analista')).toBe('/analista');
    expect(destinoAposLogin({ de: '/cliente/laudo' }, '/analista', '/analista')).toBe('/analista');
    expect(destinoAposLogin(null, '/analista', '/analista')).toBe('/analista');
  });
});
