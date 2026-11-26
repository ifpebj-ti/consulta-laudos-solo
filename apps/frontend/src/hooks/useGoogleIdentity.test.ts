import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MENSAGEM_FALHA_SCRIPT_GOOGLE, useGoogleIdentity } from './useGoogleIdentity';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

afterEach(() => {
  delete window.google;
  document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((el) => el.remove());
});

describe('useGoogleIdentity', () => {
  it('retorna mensagem de erro quando clientId está vazio', () => {
    const { result } = renderHook(() => useGoogleIdentity('', vi.fn()));
    expect(result.current.erro).toBe('Login com Google não configurado (defina VITE_GOOGLE_CLIENT_ID).');
  });

  it('inicializa e renderiza botão do Google quando window.google está disponível e repassa credencial', async () => {
    let callbackCapturado: ((res: { credential: string }) => void) | undefined;
    const initialize = vi.fn((config: { client_id: string; callback: (res: { credential: string }) => void }) => {
      callbackCapturado = config.callback;
    });
    const renderButton = vi.fn();
    window.google = {
      accounts: {
        id: { initialize, renderButton },
      },
    };

    const aoReceber = vi.fn();
    function Componente() {
      const { containerRef, erro } = useGoogleIdentity('client-id-123', aoReceber);
      return createElement(
        'div',
        null,
        createElement('div', { ref: containerRef, 'data-testid': 'google-btn' }),
        erro ? createElement('span', { role: 'alert' }, erro) : null,
      );
    }

    render(createElement(Componente));

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-id-123' }));
    expect(renderButton).toHaveBeenCalledWith(screen.getByTestId('google-btn'), expect.objectContaining({ locale: 'pt-BR' }));

    callbackCapturado?.({ credential: 'token-google-real' });
    expect(aoReceber).toHaveBeenCalledWith('token-google-real');
  });

  it('define erro quando o script do Google falha e permite tentarNovamente', async () => {
    const { result } = renderHook(() => useGoogleIdentity('client-id-123', vi.fn()));

    const script1 = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(script1).not.toBeNull();

    act(() => {
      script1?.onerror?.(new Event('error'));
    });

    await waitFor(() => expect(result.current.erro).toBe(MENSAGEM_FALHA_SCRIPT_GOOGLE));

    act(() => result.current.tentarNovamente());
    const script2 = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(script2).not.toBeNull();
    expect(script2).not.toBe(script1);
  });
});
