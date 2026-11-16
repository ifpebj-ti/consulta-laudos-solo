import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { respostaJson } from '@/test/utilitarios';
import { cartaoDoServidor, ultimaPaginaValida, useListagemServidor, type ConsultaListagem } from './useAmostrasServidor';

function itens(inicio: number, quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => ({
    protocolo: `PAG-${String(inicio + i).padStart(6, '0')}`,
    solicitante: `Produtor ${inicio + i}`,
    propriedade: 'Sítio',
    status: 'EM_ANALISE',
    dataRecebimento: '2026-11-01',
    prazo: '2026-11-20',
    atualizadoEm: null,
  }));
}

function paginaDaUrl(url: unknown): number {
  return Number(new URL(String(url)).searchParams.get('pagina'));
}

function servidorCom(total: number | null, totalReal = total ?? 0) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const pagina = paginaDaUrl(url);
    const inicio = (pagina - 1) * 100;
    const quantidade = Math.max(0, Math.min(100, totalReal - inicio));
    const dados: Record<string, unknown> = { itens: itens(inicio + 1, quantidade), pagina, tamanhoPagina: 100 };
    if (total !== null) dados.total = total;
    return respostaJson({ sucesso: true, dados });
  });
}

const CONSULTA: ConsultaListagem = { situacao: 'pendentes' };

afterEach(() => vi.restoreAllMocks());

describe('useListagemServidor', () => {
  it('com 1000 amostras mostra 10 páginas e navega entre elas', async () => {
    const fetchMock = servidorCom(1000);
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.cartoes).toHaveLength(100));
    expect(result.current.totalPaginas).toBe(10);
    expect(result.current.modo).toBe('paginas');
    expect(result.current.temMais).toBe(true);

    act(() => result.current.irPara(2));
    await waitFor(() => expect(result.current.cartoes[0].protocolo).toBe('PAG-000101'));
    expect(result.current.pagina).toBe(2);
    expect(paginaDaUrl(fetchMock.mock.calls.at(-1)?.[0])).toBe(2);

    act(() => result.current.irPara(99));
    await waitFor(() => expect(result.current.pagina).toBe(10));
    expect(result.current.temMais).toBe(false);
  });

  it('volta para a primeira página quando a busca, o filtro ou a ordenação mudam', async () => {
    const fetchMock = servidorCom(1000);
    const { result, rerender } = renderHook(({ consulta }) => useListagemServidor(true, 'token', consulta), {
      initialProps: { consulta: CONSULTA },
    });
    await waitFor(() => expect(result.current.cartoes).toHaveLength(100));
    act(() => result.current.irPara(3));
    await waitFor(() => expect(result.current.pagina).toBe(3));

    rerender({ consulta: { ...CONSULTA, busca: 'produtor' } });
    await waitFor(() => expect(paginaDaUrl(fetchMock.mock.calls.at(-1)?.[0])).toBe(1));
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('busca=produtor');
    await waitFor(() => expect(result.current.pagina).toBe(1));
  });

  it('página fora do intervalo cai para a última página válida', async () => {
    servidorCom(250);
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.totalPaginas).toBe(3));
    act(() => result.current.irPara(3));
    await waitFor(() => expect(result.current.pagina).toBe(3));
    expect(result.current.cartoes).toHaveLength(50);
  });

  it('se o total diminuir e a página ficar vazia, vai para a última página que existe', async () => {
    let total = 1000;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const pagina = paginaDaUrl(url);
      const inicio = (pagina - 1) * 100;
      const quantidade = Math.max(0, Math.min(100, total - inicio));
      return respostaJson({ sucesso: true, dados: { itens: itens(inicio + 1, quantidade), total, pagina, tamanhoPagina: 100 } });
    });
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.totalPaginas).toBe(10));
    total = 120;
    act(() => result.current.irPara(9));
    await waitFor(() => expect(result.current.pagina).toBe(2));
    expect(result.current.cartoes).toHaveLength(20);
  });

  it('sem total no servidor usa "carregar mais" e para quando a página vem incompleta', async () => {
    servidorCom(null, 230);
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.cartoes).toHaveLength(100));
    expect(result.current.modo).toBe('carregar_mais');
    expect(result.current.temMais).toBe(true);
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.cartoes).toHaveLength(200));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.cartoes).toHaveLength(230));
    expect(result.current.temMais).toBe(false);
  });

  it('sem total e com página extra vazia marca o fim sem perder o que já carregou', async () => {
    servidorCom(null, 200);
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.cartoes).toHaveLength(100));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.cartoes).toHaveLength(200));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.temMais).toBe(false));
    expect(result.current.cartoes).toHaveLength(200);
  });

  it('erro ao trocar de página mantém a página anterior na tela', async () => {
    const fetchMock = servidorCom(1000);
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.cartoes).toHaveLength(100));
    fetchMock.mockResolvedValueOnce(respostaJson({ detail: { mensagem: 'x' } }, 503));
    act(() => result.current.irPara(2));
    await waitFor(() => expect(result.current.erro).toMatch(/indisponível/));
    expect(result.current.cartoes[0].protocolo).toBe('PAG-000001');
    act(() => result.current.tentarNovamente());
    await waitFor(() => expect(result.current.cartoes[0].protocolo).toBe('PAG-000101'));
    expect(result.current.erro).toBeNull();
  });

  it('resposta sem lista de itens vira erro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ sucesso: true, dados: { itens: null } }));
    const { result } = renderHook(() => useListagemServidor(true, 'token', CONSULTA));
    await waitFor(() => expect(result.current.erro).toBe('O servidor enviou uma resposta inválida.'));
  });

  it('desativada não chama o servidor', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useListagemServidor(false, 'token', CONSULTA));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.carregandoInicial).toBe(false);
  });
});

describe('auxiliares da listagem', () => {
  it('última página válida', () => {
    expect([0, 1, 100, 101, 1000].map((t) => ultimaPaginaValida(t))).toEqual([1, 1, 1, 2, 10]);
  });

  it('descarta itens sem protocolo e trata campos nulos', () => {
    expect(cartaoDoServidor({ protocolo: null } as never)).toBeNull();
    expect(cartaoDoServidor({ protocolo: 'X', solicitante: null, status: null } as never)).toMatchObject({
      protocolo: 'X',
      solicitante: '',
      status: 'em_andamento',
    });
  });
});
