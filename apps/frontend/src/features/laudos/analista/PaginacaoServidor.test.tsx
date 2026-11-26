import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginacaoServidor } from './PaginacaoServidor';
import type { ListagemServidor } from './useAmostrasServidor';

function listagemBase(parcial: Partial<ListagemServidor> = {}): ListagemServidor {
  return {
    ativa: true,
    carregandoInicial: false,
    carregando: false,
    erro: null,
    cartoes: [],
    total: 0,
    pagina: 1,
    totalPaginas: 1,
    modo: 'paginas',
    temMais: false,
    irPara: vi.fn(),
    carregarMais: vi.fn(),
    tentarNovamente: vi.fn(),
    ...parcial,
  };
}

describe('PaginacaoServidor', () => {
  it('retorna null quando inativa ou carregandoInicial', () => {
    const { container, rerender } = render(<PaginacaoServidor listagem={listagemBase({ ativa: false })} rotulo="amostras" />);
    expect(container).toBeEmptyDOMElement();

    rerender(<PaginacaoServidor listagem={listagemBase({ carregandoInicial: true })} rotulo="amostras" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('modo carregar_mais exibe contagem, controla botão e marca fim da lista', async () => {
    const carregarMais = vi.fn();
    const usuario = userEvent.setup();
    const cartao = { protocolo: 'P-1', solicitante: 'A', propriedade: 'B', prazo: '2026-11-20', status: 'em_andamento' as const };

    const { rerender } = render(
      <PaginacaoServidor
        listagem={listagemBase({ modo: 'carregar_mais', cartoes: [cartao], temMais: true, carregarMais })}
        rotulo="amostras"
      />,
    );

    expect(screen.getByText('1 amostra carregada')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(carregarMais).toHaveBeenCalledTimes(1);

    rerender(
      <PaginacaoServidor
        listagem={listagemBase({ modo: 'carregar_mais', cartoes: [cartao, cartao], temMais: true, carregando: true })}
        rotulo="amostras"
      />,
    );
    expect(screen.getByText('2 amostras carregadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregando…' })).toBeDisabled();

    rerender(
      <PaginacaoServidor
        listagem={listagemBase({ modo: 'carregar_mais', cartoes: [cartao, cartao], temMais: false })}
        rotulo="amostras"
      />,
    );
    expect(screen.getByText('2 amostras carregadas (todas)')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('modo paginas exibe resumo em página única e navega em múltiplas páginas', async () => {
    const irPara = vi.fn();
    const usuario = userEvent.setup();

    const { rerender } = render(
      <PaginacaoServidor listagem={listagemBase({ total: 1, totalPaginas: 1 })} rotulo="amostras" />,
    );
    expect(screen.getByText('1 amostra')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <PaginacaoServidor listagem={listagemBase({ total: 250, pagina: 2, totalPaginas: 3, irPara })} rotulo="amostras" />,
    );
    expect(screen.getByText(/Amostras 101–200 de 250 · lote 2 de 3/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: '100 anteriores' }));
    expect(irPara).toHaveBeenCalledWith(1);

    await usuario.click(screen.getByRole('button', { name: 'Próximas 100' }));
    expect(irPara).toHaveBeenCalledWith(3);
  });
});
