import { describe, expect, it, vi } from 'vitest';
import { authService } from './authService';
import { respostaJson } from '@/test/utilitarios';

describe('authService', () => {
  it('loginLocal envia username sem espaços nas pontas e normaliza resposta', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({
        sucesso: true,
        token: 'jwt-power',
        tipoToken: 'Bearer',
        usuario: { nome: 'PowerUser', email: 'power@local', role: 'POWER_USER' },
      }),
    );

    const res = await authService.loginLocal('  PowerUser  ', 'segredo123');

    expect(res.token).toBe('jwt-power');
    expect(res.usuario.role).toBe('POWER_USER');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/login$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ username: 'PowerUser', password: 'segredo123' });
  });

  it('loginGoogle envia idToken para /auth/google e normaliza resposta', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({
        sucesso: true,
        token: 'jwt-analista',
        tipoToken: 'Bearer',
        usuario: { nome: 'Carla', email: 'carla@lab.br', role: 'ANALISTA', crea: 'CREA-PE 1' },
      }),
    );

    const res = await authService.loginGoogle('google-id-token');

    expect(res.usuario.crea).toBe('CREA-PE 1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/google$/);
    expect(JSON.parse(String(init?.body))).toEqual({ idToken: 'google-id-token' });
  });

  it('loginCliente normaliza protocolo e CPF antes de enviar', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({
        sucesso: true,
        token: 'jwt-cliente',
        tipoToken: 'Bearer',
        laudo: {
          protocolo: 'LAB-2026-01',
          status: 'CONCLUIDO',
          cliente: { nome: 'João', cpfMascarado: '***.982.247-**' },
        },
      }),
    );

    const res = await authService.loginCliente('  lab-2026-01  ', '529.982.247-25');

    expect(res.laudo.protocolo).toBe('LAB-2026-01');
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ protocolo: 'LAB-2026-01', cpf: '52998224725' });
  });

  it('sessaoAtual consulta /auth/me com Bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({ sub: 'carla@lab.br', role: 'ANALISTA', nome: 'Carla' }),
    );

    const res = await authService.sessaoAtual('meu-token');

    expect(res.role).toBe('ANALISTA');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/me$/);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer meu-token');
  });

  it('CRUD de analistas principais (listar, criar e remover com encodeURIComponent)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ sucesso: true, dados: [] }))
      .mockResolvedValueOnce(
        respostaJson({ id: 'id/1', nome: 'Ana', email: 'ana@gmail.com', crea: 'CREA-1', criadoEm: '2026-11-01', auxiliares: [] }),
      )
      .mockResolvedValueOnce(respostaJson({ sucesso: true, mensagem: 'Removido' }));

    await authService.listarAnalistasPrincipais('tok');
    await authService.criarAnalistaPrincipal({ nome: 'Ana', email: 'ana@gmail.com', crea: 'CREA-1' }, 'tok');
    await authService.removerAnalistaPrincipal('id/com barra', 'tok');

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/usuarios\/analistas$/);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');

    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/usuarios\/analistas$/);
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');

    expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/usuarios\/analistas\/id%2Fcom%20barra$/);
    expect(fetchMock.mock.calls[2][1]?.method).toBe('DELETE');
  });

  it('CRUD de auxiliares (listar, criar e remover com encodeURIComponent)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ sucesso: true, dados: [] }))
      .mockResolvedValueOnce(respostaJson({ id: 'aux-1', nome: 'Lucas', email: 'lucas@gmail.com', criadoEm: '2026-11-01' }))
      .mockResolvedValueOnce(respostaJson({ sucesso: true, mensagem: 'Removido' }));

    await authService.listarAuxiliares('tok');
    await authService.criarAuxiliar({ nome: 'Lucas', email: 'lucas@gmail.com' }, 'tok');
    await authService.removerAuxiliar('aux/1', 'tok');

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/usuarios\/auxiliares$/);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');

    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/usuarios\/auxiliares$/);
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');

    expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/usuarios\/auxiliares\/aux%2F1$/);
    expect(fetchMock.mock.calls[2][1]?.method).toBe('DELETE');
  });
});
