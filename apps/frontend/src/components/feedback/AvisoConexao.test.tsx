import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvisoConexao } from './AvisoConexao';

function definirOnline(valor: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: valor });
  window.dispatchEvent(new Event(valor ? 'online' : 'offline'));
}

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('AvisoConexao', () => {
  it('avisa quando a conexão cai e confirma quando volta', () => {
    vi.useFakeTimers();
    render(<AvisoConexao />);
    expect(screen.queryByText(/sem conexão/)).not.toBeInTheDocument();

    act(() => definirOnline(false));
    expect(screen.getByText(/sem conexão com a internet/)).toBeInTheDocument();

    act(() => definirOnline(true));
    expect(screen.getByText('Conexão restabelecida.')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Conexão restabelecida.')).not.toBeInTheDocument();
  });
});
