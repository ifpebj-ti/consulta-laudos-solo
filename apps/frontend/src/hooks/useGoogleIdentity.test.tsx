import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MENSAGEM_FALHA_SCRIPT_GOOGLE, useGoogleIdentity } from './useGoogleIdentity';

function Sonda({ clientId, aoCredencial }: { clientId: string; aoCredencial: (t: string) => void }) {
  const { containerRef, erro, tentarNovamente } = useGoogleIdentity(clientId, aoCredencial);
  return (
    <div>
      <div ref={containerRef} data-testid="botao" />
      {erro && <p role="alert">{erro}</p>}
      <button type="button" onClick={tentarNovamente}>
        retry
      </button>
    </div>
  );
}

afterEach(() => {
  delete window.google;
  document.head.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());
});

describe('useGoogleIdentity', () => {
  it('avisa quando não há client id configurado', async () => {
    render(<Sonda clientId="" aoCredencial={() => undefined} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/não configurado/);
  });

  it('inicializa o SDK existente, renderiza o botão e repassa a credencial', async () => {
    let callback: (r: { credential: string }) => void = () => undefined;
    const initialize = vi.fn((cfg: { callback: typeof callback }) => {
      callback = cfg.callback;
    });
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };
    const aoCredencial = vi.fn();

    render(<Sonda clientId="cid" aoCredencial={aoCredencial} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'cid' }));

    callback({ credential: 'idtoken' });
    expect(aoCredencial).toHaveBeenCalledWith('idtoken');
    callback({ credential: '' });
    expect(aoCredencial).toHaveBeenCalledTimes(1);
  });

  it('carrega o script e mostra erro quando o carregamento falha, permitindo nova tentativa', async () => {
    render(<Sonda clientId="cid" aoCredencial={() => undefined} />);
    const script = await waitFor(() => {
      const s = document.head.querySelector<HTMLScriptElement>('script[src*="accounts.google.com"]');
      expect(s).not.toBeNull();
      return s!;
    });
    act(() => {
      script.onerror?.(new Event('error'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_FALHA_SCRIPT_GOOGLE);

    act(() => screen.getByRole('button', { name: 'retry' }).click());
    await waitFor(() => {
      const scripts = document.head.querySelectorAll('script[src*="accounts.google.com"]');
      expect(scripts).toHaveLength(1);
      expect((scripts[0] as HTMLScriptElement).dataset.falhou).toBeUndefined();
    });
  });
});
