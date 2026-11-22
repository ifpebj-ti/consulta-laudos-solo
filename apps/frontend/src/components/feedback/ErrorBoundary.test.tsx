import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Quebra({ mensagem }: { mensagem: string }): never {
  throw new Error(mensagem);
}

function ConteudoNormal() {
  return <p>Conteúdo recuperado</p>;
}

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('ErrorBoundary', () => {
  it('falha ao carregar tela sem internet explica a falta de conexão, não uma nova versão', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(
      <ErrorBoundary>
        <Quebra mensagem="Failed to fetch dynamically imported module: /src/x.tsx" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/porque você está sem conexão/)).toBeInTheDocument();
    expect(screen.queryByText(/O sistema foi atualizado/)).not.toBeInTheDocument();
  });

  it('falha ao carregar tela com internet sugere nova versão', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Quebra mensagem="Failed to fetch dynamically imported module: /src/x.tsx" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/O sistema foi atualizado/)).toBeInTheDocument();
  });

  it('erro genérico exibe mensagem padrão e atualiza o título da página', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Quebra mensagem="Referência indefinida no cálculo" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Não foi possível exibir esta tela/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recarregar página/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para o início/ })).toHaveAttribute('href', '/');
    expect(document.title).toMatch(/^Erro inesperado/);
  });

  it('reinicia automaticamente quando chaveReinicio muda', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <ErrorBoundary chaveReinicio="/rota-1">
        <Quebra mensagem="Falha pontual" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Não foi possível exibir esta tela/)).toBeInTheDocument();

    rerender(
      <ErrorBoundary chaveReinicio="/rota-2">
        <ConteudoNormal />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Conteúdo recuperado')).toBeInTheDocument();
  });
});
