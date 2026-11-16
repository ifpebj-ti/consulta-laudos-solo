import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Quebra({ mensagem }: { mensagem: string }): never {
  throw new Error(mensagem);
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
});
