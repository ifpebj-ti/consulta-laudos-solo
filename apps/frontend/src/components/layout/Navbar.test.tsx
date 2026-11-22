import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from './Navbar';
import { tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';

describe('Navbar', () => {
  it('exibe título e nome do usuário e ao sair limpa sessão navegando para /', async () => {
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

    await usuario.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Página Inicial')).toBeInTheDocument();
    expect(sessionStorage.getItem(CHAVE_AUTH)).toBeNull();
  });
});
