import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient, extrairNomeArquivo, registrarManipuladorNaoAutorizado } from './apiClient';
import { respostaJson, respostaPdf } from '@/test/utilitarios';

function mockFetch(implementacao: typeof fetch) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(implementacao);
}

async function capturar(promessa: Promise<unknown>): Promise<ApiError> {
  try {
    await promessa;
  } catch (erro) {
    if (erro instanceof ApiError) return erro;
    throw erro;
  }
  throw new Error('A promessa deveria ter falhado.');
}

afterEach(() => {
  registrarManipuladorNaoAutorizado(null);
  vi.useRealTimers();
});

describe('apiClient.request', () => {
  it('envia JSON, token e query string e devolve o corpo', async () => {
    const fetchMock = mockFetch(async () => respostaJson({ ok: true }));
    const resposta = await apiClient.request<{ ok: boolean }>('/teste', {
      method: 'POST',
      body: { a: 1 },
      token: 'abc',
      query: { pagina: 2, busca: '', vazio: undefined },
    });
    expect(resposta).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/teste\?pagina=2$/);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc');
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('usa a mensagem de erro do backend no formato detail.mensagem', async () => {
    mockFetch(async () => respostaJson({ detail: { sucesso: false, mensagem: 'Protocolo inválido.' } }, 400));
    const erro = await capturar(apiClient.request('/x'));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Protocolo inválido.');
  });

  it('converte erros 422 do FastAPI em lista legível', async () => {
    mockFetch(async () =>
      respostaJson({ detail: [{ loc: ['body', 'cpf'], msg: 'CPF inválido.' }] }, 422),
    );
    const erro = await capturar(apiClient.request('/x'));
    expect(erro.codigoErro).toBe('VALIDATION_ERROR');
    expect(erro.erros).toEqual(['cpf: CPF inválido.']);
  });

  it('não vaza detalhes técnicos em 5xx e 429', async () => {
    mockFetch(async () => respostaJson({ detail: { mensagem: 'Traceback: KeyError' } }, 500));
    expect((await capturar(apiClient.request('/x'))).message).toMatch(/erro inesperado/);
    mockFetch(async () => respostaJson({ error: 'Rate limit exceeded: 5 per 1 minute' }, 429));
    expect((await capturar(apiClient.request('/x'))).message).toMatch(/Muitas tentativas/);
  });

  it('trata corpo que não é JSON', async () => {
    mockFetch(async () => new Response('<html>Bad gateway</html>', { status: 502 }));
    const erro = await capturar(apiClient.request('/x'));
    expect(erro.status).toBe(502);
    expect(erro.message).toMatch(/indisponível/);
  });

  it('identifica falha de rede', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const erro = await capturar(apiClient.request('/x'));
    expect(erro.status).toBe(0);
    expect(erro.codigoErro).toBe('NETWORK_ERROR');
  });

  it('aborta por tempo limite', async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const erro = await capturar(apiClient.request('/x', { timeoutMs: 10 }));
    expect(erro.codigoErro).toBe('TIMEOUT');
  });

  it('respeita o cancelamento externo', async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const controlador = new AbortController();
    const promessa = capturar(apiClient.request('/x', { signal: controlador.signal }));
    controlador.abort();
    const erro = await promessa;
    expect(erro.foiCancelada).toBe(true);
  });

  it('avisa a sessão quando uma chamada autenticada recebe 401', async () => {
    const manipulador = vi.fn();
    registrarManipuladorNaoAutorizado(manipulador);
    mockFetch(async () => respostaJson({ detail: { mensagem: 'Sessão expirada.' } }, 401));
    await capturar(apiClient.request('/x', { token: 'abc' }));
    expect(manipulador).toHaveBeenCalledTimes(1);
    await capturar(apiClient.request('/x'));
    expect(manipulador).toHaveBeenCalledTimes(1);
  });
});

describe('apiClient.requestArquivo', () => {
  it('devolve o arquivo e o nome do Content-Disposition', async () => {
    mockFetch(async () => respostaPdf('%PDF', { 'Content-Disposition': 'attachment; filename="laudo-X.pdf"' }));
    const arquivo = await apiClient.requestArquivo('/pdf', { token: 't', tiposAceitos: ['application/pdf'] });
    expect(arquivo.nomeArquivo).toBe('laudo-X.pdf');
    expect(arquivo.blob.size).toBeGreaterThan(0);
  });

  it('rejeita tipo de conteúdo inesperado', async () => {
    mockFetch(async () => respostaJson({ ok: true }));
    const erro = await capturar(apiClient.requestArquivo('/pdf', { token: 't', tiposAceitos: ['application/pdf'] }));
    expect(erro.codigoErro).toBe('INVALID_RESPONSE');
  });
});

describe('extrairNomeArquivo', () => {
  it('lê filename simples, entre aspas e filename* em UTF-8', () => {
    expect(extrairNomeArquivo(null)).toBeNull();
    expect(extrairNomeArquivo('attachment; filename=laudo.pdf')).toBe('laudo.pdf');
    expect(extrairNomeArquivo('attachment; filename="laudo 1.pdf"')).toBe('laudo 1.pdf');
    expect(extrairNomeArquivo("attachment; filename*=UTF-8''laudo%20%C3%A1.pdf")).toBe('laudo á.pdf');
  });
});
