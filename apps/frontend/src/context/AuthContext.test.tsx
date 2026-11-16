import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ConsultaLaudoPage } from '@/features/auth/cliente/ConsultaLaudoPage';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';
import { apiClient } from '@/services/apiClient';

const CHAVE = 'consulta-laudos-solo:auth';

function Sessao({ id }: { id: string }) {
  const { session, sair } = useAuth();
  return (
    <div>
      <span data-testid={`sessao-${id}`}>{session ? 'ativa' : 'encerrada'}</span>
      <button type="button" onClick={() => sair()}>
        sair-{id}
      </button>
    </div>
  );
}

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('saída sincronizada entre abas', () => {
  it('sair numa aba encerra a outra aba com a mesma sessão, mas não uma sessão diferente', async () => {
    const token = tokenComExpiracao(3600);
    sessionStorage.setItem(CHAVE, JSON.stringify({ token, role: 'CLIENTE' }));
    const abaA = render(
      <AuthProvider>
        <Sessao id="a" />
      </AuthProvider>,
    );
    const abaB = render(
      <AuthProvider>
        <Sessao id="b" />
      </AuthProvider>,
    );
    sessionStorage.setItem(CHAVE, JSON.stringify({ token: tokenComExpiracao(7200), role: 'ANALISTA' }));
    const abaC = render(
      <AuthProvider>
        <Sessao id="c" />
      </AuthProvider>,
    );

    expect(screen.getByTestId('sessao-b')).toHaveTextContent('ativa');
    await userEvent.click(screen.getByRole('button', { name: 'sair-a' }));

    expect(screen.getByTestId('sessao-a')).toHaveTextContent('encerrada');
    await waitFor(() => expect(screen.getByTestId('sessao-b')).toHaveTextContent('encerrada'));
    expect(screen.getByTestId('sessao-c')).toHaveTextContent('ativa');
    abaA.unmount();
    abaB.unmount();
    abaC.unmount();
  });
});

describe('espera progressiva na consulta do cliente', () => {
  it('depois de três consultas sem sucesso bloqueia o botão e não chama a API', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => respostaJson({ detail: { mensagem: 'Dados inválidos.' } }, 401));
    const usuario = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/cliente']}>
        <AuthProvider>
          <ConsultaLaudoPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await usuario.type(screen.getByLabelText('Protocolo'), '20101.2306');
    await usuario.type(screen.getByLabelText('CPF do titular'), '11144477735');
    for (let i = 0; i < 3; i += 1) {
      await usuario.click(screen.getByRole('button', { name: /Consultar Laudo/ }));
      await screen.findByText(/Não encontramos um laudo/);
    }
    expect(screen.getByRole('alert')).toHaveTextContent(/aguarde 5 segundos/);
    const botao = screen.getByRole('button', { name: /Aguarde \d s/ });
    expect(botao).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await act(async () => {
      screen.getByRole('button', { name: /Aguarde/ }).closest('form')?.requestSubmit();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('sessão apagada do storage e chamadas depois do logout', () => {
  it('detecta o token apagado ao voltar o foco e encerra a sessão', async () => {
    sessionStorage.setItem(CHAVE, JSON.stringify({ token: tokenComExpiracao(3600), role: 'CLIENTE' }));
    render(
      <AuthProvider>
        <Sessao id="a" />
        <MotivoSaida />
      </AuthProvider>,
    );
    expect(screen.getByTestId('sessao-a')).toHaveTextContent('ativa');
    sessionStorage.removeItem(CHAVE);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByTestId('sessao-a')).toHaveTextContent('encerrada');
    expect(screen.getByTestId('motivo')).toHaveTextContent('sessao_encerrada');
  });

  it('token trocado no storage também encerra ao voltar para a aba', () => {
    sessionStorage.setItem(CHAVE, JSON.stringify({ token: tokenComExpiracao(3600), role: 'CLIENTE' }));
    render(
      <AuthProvider>
        <Sessao id="a" />
      </AuthProvider>,
    );
    sessionStorage.setItem(CHAVE, JSON.stringify({ token: tokenComExpiracao(7200), role: 'ANALISTA' }));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByTestId('sessao-a')).toHaveTextContent('encerrada');
  });

  it('chamada autenticada com o token apagado não sai para a rede', async () => {
    const token = tokenComExpiracao(3600);
    sessionStorage.setItem(CHAVE, JSON.stringify({ token, role: 'ANALISTA' }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ ok: true }));
    render(
      <AuthProvider>
        <Sessao id="a" />
      </AuthProvider>,
    );
    sessionStorage.removeItem(CHAVE);
    await act(async () => {
      await expect(apiClient.request('/laudos', { token })).rejects.toMatchObject({ codigoErro: 'SESSAO_ENCERRADA', status: 401 });
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('sessao-a')).toHaveTextContent('encerrada');
  });

  it('depois do logout nenhuma chamada usa o token antigo', async () => {
    const token = tokenComExpiracao(3600);
    sessionStorage.setItem(CHAVE, JSON.stringify({ token, role: 'ANALISTA' }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ ok: true }));
    render(
      <AuthProvider>
        <Sessao id="a" />
      </AuthProvider>,
    );
    await apiClient.request('/laudos', { token });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'sair-a' }));
    await expect(apiClient.request('/laudos/X/analise/rascunho', { method: 'PATCH', body: {}, token })).rejects.toMatchObject({
      codigoErro: 'SESSAO_ENCERRADA',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('chamadas sem token continuam funcionando depois do logout', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ ok: true }));
    render(
      <AuthProvider>
        <Sessao id="a" />
      </AuthProvider>,
    );
    await expect(apiClient.request('/auth/cliente', { method: 'POST', body: {} })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function MotivoSaida() {
  const { motivoUltimaSaida } = useAuth();
  return <span data-testid="motivo">{motivoUltimaSaida ?? ''}</span>;
}
