import { afterEach, describe, expect, it } from 'vitest';
import { destinoAposLogin } from '@/routes/rotas';
import {
  consultaBloqueadaAte,
  esperaAposFalhas,
  limparFalhasConsulta,
  registrarFalhaConsulta,
  segundosRestantes,
} from './tentativasConsulta';
import { chavePersistenciaAnalista } from './persistenciaAnalista';
import { impressaoDoToken } from './token';
import { mascararCpfExibicao, normalizarLaudo } from '@/services/respostasApi';

afterEach(() => sessionStorage.clear());

describe('destinoAposLogin contra open redirect', () => {
  it.each([
    '//evil.example/x',
    'https://evil.example/',
    'javascript:alert(1)',
    '/%2F%2Fevil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '/analista/\\\\evil.example',
    '/analista/../cliente/laudo',
    '/analista@evil.example',
    '/analista/%00',
    '/analista/\t//evil.example',
    '/analistas',
    '',
  ])('recusa %j', (de) => {
    expect(destinoAposLogin({ de }, '/analista', '/analista')).toBe('/analista');
  });

  it('aceita rotas internas do módulo, com busca', () => {
    expect(destinoAposLogin({ de: '/analista' }, '/analista', '/x')).toBe('/analista');
    expect(destinoAposLogin({ de: '/analista/analises/LAB-2026-0142?aba=1' }, '/analista', '/x')).toBe(
      '/analista/analises/LAB-2026-0142?aba=1',
    );
  });

  it('ignora estado inválido', () => {
    expect(destinoAposLogin(null, '/analista', '/analista')).toBe('/analista');
    expect(destinoAposLogin({ de: 42 }, '/analista', '/analista')).toBe('/analista');
  });
});

describe('espera progressiva da consulta', () => {
  it('libera as duas primeiras falhas e dobra a espera a partir da terceira, até 5 minutos', () => {
    expect([1, 2, 3, 4, 5, 20].map(esperaAposFalhas)).toEqual([0, 0, 5, 10, 20, 300]);
  });

  it('bloqueia depois da terceira falha, sobrevive a recarregar e limpa no sucesso', () => {
    const agora = 1_000_000;
    expect(registrarFalhaConsulta(agora)).toBe(0);
    expect(registrarFalhaConsulta(agora)).toBe(0);
    const ate = registrarFalhaConsulta(agora);
    expect(ate).toBe(agora + 5000);
    expect(consultaBloqueadaAte()).toBe(ate);
    expect(segundosRestantes(ate, agora + 1200)).toBe(4);
    expect(segundosRestantes(ate, agora + 6000)).toBe(0);
    limparFalhasConsulta();
    expect(consultaBloqueadaAte()).toBe(0);
  });

  it('storage corrompido não quebra', () => {
    sessionStorage.setItem('consulta-laudos-solo:tentativas-consulta', '{lixo');
    expect(consultaBloqueadaAte()).toBe(0);
  });
});

describe('dados sensíveis', () => {
  it('CPF completo vindo do back é mascarado', () => {
    expect(mascararCpfExibicao('529.982.247-25')).toBe('***.982.247-**');
    expect(mascararCpfExibicao('52998224725')).toBe('***.982.247-**');
    expect(mascararCpfExibicao('***.982.247-**')).toBe('***.982.247-**');
    expect(mascararCpfExibicao('5299822')).toBe('***.***.***-**');
    expect(normalizarLaudo({ protocolo: 'P', cliente: { cpfMascarado: '52998224725' } }).cliente.cpfMascarado).toBe(
      '***.982.247-**',
    );
  });

  it('rascunhos locais ficam separados por analista', () => {
    expect(chavePersistenciaAnalista('A@x.br')).not.toBe(chavePersistenciaAnalista('b@x.br'));
    expect(chavePersistenciaAnalista('A@x.br')).toBe(chavePersistenciaAnalista('a@x.br'));
    expect(chavePersistenciaAnalista('')).toBeNull();
    expect(chavePersistenciaAnalista(undefined)).toBeNull();
  });

  it('impressão do token não expõe o token', () => {
    // Montado em partes para não parecer um JWT real a scanners de segredos.
    const token = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiI1Mjk5ODIyNDcyNSJ9', 'assinatura'].join('.');
    expect(impressaoDoToken(token)).not.toContain('eyJ');
    expect(impressaoDoToken(token)).toBe(impressaoDoToken(token));
    expect(impressaoDoToken(token)).not.toBe(impressaoDoToken(`${token}x`));
  });
});
