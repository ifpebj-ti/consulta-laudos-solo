import { afterEach, describe, expect, it, vi } from 'vitest';
import { analiseService } from './analiseService';
import { respostaJson } from '@/test/utilitarios';

function simularFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respostaJson({ sucesso: true }));
}

function ultimaChamada(fetchMock: ReturnType<typeof simularFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init as RequestInit };
}

afterEach(() => vi.restoreAllMocks());

describe('analiseService', () => {
  it('cria amostra com POST /laudos e token Bearer', async () => {
    const fetchMock = simularFetch();
    await analiseService.criarAmostra(
      {
        protocolo: 'LAB-1',
        cpf_cliente: '52998224725',
        cliente_nome: 'Maria',
        propriedade: 'Sítio',
        dataRecebimento: '2026-01-10',
        tipoAnalise: 'quimica',
        culturaExistente: 'Milho',
      },
      'tok',
    );
    const { url, init } = ultimaChamada(fetchMock);
    expect(url).toMatch(/\/laudos$/);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
    expect(JSON.parse(String(init.body)).protocolo).toBe('LAB-1');
  });

  it('lista amostras enviando filtros na query e removendo espaços da busca', async () => {
    const fetchMock = simularFetch();
    await analiseService.listarAmostras({ pagina: 2, tamanhoPagina: 10, busca: '  abc ', situacao: 'pendentes' }, 'tok');
    const { url } = ultimaChamada(fetchMock);
    expect(url).toContain('pagina=2');
    expect(url).toContain('tamanhoPagina=10');
    expect(url).toContain('busca=abc');
    expect(url).toContain('situacao=pendentes');
  });

  it('usa o protocolo codificado nas rotas de análise', async () => {
    const fetchMock = simularFetch();
    await analiseService.obterAnalise('A/B 1', 'tok');
    expect(ultimaChamada(fetchMock).url).toContain('/laudos/A%2FB%201/analise');

    await analiseService.salvarRascunho('P1', { versaoEsperada: 1 }, 'tok');
    let chamada = ultimaChamada(fetchMock);
    expect(chamada.url).toMatch(/\/laudos\/P1\/analise\/rascunho$/);
    expect(chamada.init.method).toBe('PATCH');

    await analiseService.processarAnalise(
      'P1',
      { versaoEsperada: 2, quimica: {} as never, granulometria: {} as never, calibracao: {} as never },
      'tok',
    );
    chamada = ultimaChamada(fetchMock);
    expect(chamada.url).toMatch(/\/analise\/processar$/);
    expect(chamada.init.method).toBe('POST');

    await analiseService.homologarLaudo('P1', { versaoEsperada: 3 }, 'tok');
    chamada = ultimaChamada(fetchMock);
    expect(chamada.url).toMatch(/\/laudos\/P1\/homologar$/);
    expect(JSON.parse(String(chamada.init.body))).toEqual({ versaoEsperada: 3 });
  });
});
