import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from './Navbar';
import { tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';

describe('Navbar', () => {
  it('exibe título, nome do usuário e versão abaixo da navbar, e ao sair limpa sessão navegando para /', async () => {
    sessionStorage.setItem(
      CHAVE_AUTH,
      JSON.stringify({
        token: tokenComExpiracao(3600),
        role: 'ANALISTA',
        nome: 'Carla Andrade',
      }),
    );

    const usuario = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/analista']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<p>Página Inicial</p>} />
            <Route path="/analista" element={<Navbar titulo="Módulo do Analista" />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Módulo do Analista')).toBeInTheDocument();
    expect(screen.getByText('Carla Andrade')).toBeInTheDocument();
    expect(screen.getByLabelText('Versão da aplicação')).toHaveTextContent(/^Versão v\d+/);

    await usuario.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Página Inicial')).toBeInTheDocument();
    expect(sessionStorage.getItem(CHAVE_AUTH)).toBeNull();
  });

  it('não exibe a versão quando não há sessão ativa', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar titulo="Módulo Público" />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText('Versão da aplicação')).not.toBeInTheDocument();
  });
});
