import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LoginAnalistaPage } from './LoginAnalistaPage';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';

function renderizarLogin(rotaInicial = '/analista/login', sessao?: object) {
  if (sessao) sessionStorage.setItem(CHAVE_AUTH, JSON.stringify(sessao));
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <AuthProvider>
        <Routes>
          <Route path="/analista/login" element={<LoginAnalistaPage />} />
          <Route path="/analista" element={<p>Painel Analista Destino</p>} />
          <Route path="/power-user" element={<p>Painel PowerUser Destino</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginAnalistaPage', () => {
  it('oculta login local por padrão, não exibe PowerUser e valida ao expandir', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const usuario = userEvent.setup();
    renderizarLogin();

    expect(screen.queryByText(/PowerUser/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Usuário')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Acesso administrativo' }));
    await usuario.click(screen.getByRole('button', { name: /Entrar com Usuário e Senha/ }));

    expect(screen.getByText('Informe o usuário.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('login local administrativo redireciona para /power-user e trata erro 401', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ detail: { mensagem: 'Usuário ou senha inválidos.' } }, 401))
      .mockResolvedValueOnce(
        respostaJson({
          sucesso: true,
          token: tokenComExpiracao(3600),
          tipoToken: 'Bearer',
          usuario: { nome: 'Administrador', email: 'admin@local', role: 'POWER_USER' },
        }),
      );

    const usuario = userEvent.setup();
    renderizarLogin();

    await usuario.click(screen.getByRole('button', { name: 'Acesso administrativo' }));
    await usuario.type(screen.getByLabelText('Usuário'), 'admin');
    await usuario.type(screen.getByLabelText('Senha'), 'errada');
    await usuario.click(screen.getByRole('button', { name: /Entrar com Usuário e Senha/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos.');

    await usuario.clear(screen.getByLabelText('Senha'));
    await usuario.type(screen.getByLabelText('Senha'), 'correta');
    await usuario.click(screen.getByRole('button', { name: /Entrar com Usuário e Senha/ }));

    expect(await screen.findByText('Painel PowerUser Destino')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('login com botão de desenvolvimento envia mock-dev-token, redireciona analista e trata erro 403', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ detail: { mensagem: 'Sem permissão' } }, 403))
      .mockResolvedValueOnce(
        respostaJson({
          sucesso: true,
          token: tokenComExpiracao(3600),
          tipoToken: 'Bearer',
          usuario: { nome: 'Carla Andrade', email: 'carla@lab.br', role: 'ANALISTA', crea: 'CREA-PE 1' },
        }),
      );

    const usuario = userEvent.setup();
    renderizarLogin();

    const botaoTeste = screen.getByRole('button', { name: /Entrar como analista de teste/ });
    await usuario.click(botaoTeste);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta conta não tem acesso ao módulo do analista. Entre com o e-mail institucional autorizado pelo laboratório.',
    );

    await usuario.click(botaoTeste);
    expect(await screen.findByText('Painel Analista Destino')).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ idToken: 'mock-dev-token' });
  });

  it('redireciona automaticamente quando já existe sessão válida', () => {
    const view1 = renderizarLogin('/analista/login', {
      token: tokenComExpiracao(3600),
      role: 'POWER_USER',
      nome: 'PowerUser',
    });
    expect(screen.getByText('Painel PowerUser Destino')).toBeInTheDocument();
    view1.unmount();

    sessionStorage.clear();
    renderizarLogin('/analista/login', {
      token: tokenComExpiracao(3600),
      role: 'ANALISTA',
      nome: 'Carla',
    });
    expect(screen.getByText('Painel Analista Destino')).toBeInTheDocument();
  });
});
