import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { PowerUserPage } from './PowerUserPage';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';

function renderizarPowerUser() {
  sessionStorage.setItem(
    CHAVE_AUTH,
    JSON.stringify({
      token: tokenComExpiracao(3600),
      role: 'POWER_USER',
      nome: 'Administrador',
    }),
  );
  return render(
    <MemoryRouter initialEntries={['/power-user']}>
      <AuthProvider>
        <PowerUserPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('PowerUserPage', () => {
  it('carrega analistas principais com auxiliares vinculados e configura título e #conteudo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({
        sucesso: true,
        dados: [
          {
            id: 'a-1',
            nome: 'Prof. Carla Andrade',
            email: 'carla@gmail.com',
            crea: 'CREA-PE 123456-D',
            criadoEm: '2026-11-01T10:00:00Z',
            auxiliares: [{ id: 'aux-1', nome: 'Lucas Aux', email: 'lucas@gmail.com', criadoEm: '2026-11-02T10:00:00Z' }],
          },
        ],
      }),
    );

    renderizarPowerUser();

    expect(document.title).toMatch(/^Gestão de Analistas · Administração/);
    expect(document.getElementById('conteudo')).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByText(/PowerUser/i)).not.toBeInTheDocument();

    expect(await screen.findByText('Prof. Carla Andrade')).toBeInTheDocument();
    expect(screen.getByText('carla@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('CREA-PE 123456-D')).toBeInTheDocument();
    expect(screen.getByText('1 auxiliar')).toBeInTheDocument();
    expect(screen.getByText('Lucas Aux (lucas@gmail.com)')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há analistas e erro quando falha ao carregar', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ sucesso: true, dados: [] }));

    const view = renderizarPowerUser();
    expect(await screen.findByText('Nenhum Analista Principal cadastrado no momento.')).toBeInTheDocument();
    view.unmount();

    fetchMock.mockResolvedValueOnce(respostaJson({ detail: { mensagem: 'Falha ao consultar analistas.' } }, 500));
    renderizarPowerUser();
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro inesperado|Falha/);
  });

  it('valida campos obrigatórios, cadastra analista com sucesso e trata erro 409', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ sucesso: true, dados: [] }))
      .mockResolvedValueOnce(
        respostaJson(
          {
            id: 'a-2',
            nome: 'Dr. Marcos Silva',
            email: 'marcos@gmail.com',
            crea: 'CREA-PE 99999-D',
            criadoEm: '2026-11-10T10:00:00Z',
            auxiliares: [],
          },
          201,
        ),
      )
      .mockResolvedValueOnce(respostaJson({ detail: { mensagem: 'E-mail já cadastrado.' } }, 409));

    const usuario = userEvent.setup();
    renderizarPowerUser();
    await screen.findByText('Nenhum Analista Principal cadastrado no momento.');

    // Submete com espaços em branco para acionar validação explícita do componente
    const form = screen.getByRole('button', { name: /Autorizar Analista Principal/ }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Preencha o Nome do Analista, a conta Gmail e o número do CREA.',
    );

    await usuario.type(screen.getByLabelText(/Nome do Analista/), 'Dr. Marcos Silva');
    await usuario.type(screen.getByLabelText(/E-mail Google/), 'MARCOS@GMAIL.COM');
    await usuario.type(screen.getByLabelText(/Número do CREA/), 'CREA-PE 99999-D');
    await usuario.click(screen.getByRole('button', { name: /Autorizar Analista Principal/ }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Analista Principal "Dr. Marcos Silva" (CREA-PE 99999-D) cadastrado com sucesso.',
    );
    expect(screen.getByLabelText(/Nome do Analista/)).toHaveValue('');
    expect(screen.getByLabelText(/E-mail Google/)).toHaveValue('');
    expect(screen.getByLabelText(/Número do CREA/)).toHaveValue('');

    // Tenta cadastrar duplicado e recebe 409
    await usuario.type(screen.getByLabelText(/Nome do Analista/), 'Outro');
    await usuario.type(screen.getByLabelText(/E-mail Google/), 'marcos@gmail.com');
    await usuario.type(screen.getByLabelText(/Número do CREA/), 'CREA-PE 11111-D');
    await usuario.click(screen.getByRole('button', { name: /Autorizar Analista Principal/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado.');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('remove analista e bloqueia duplo clique enquanto a remoção está em andamento', async () => {
    let resolverDelete!: (valor: Response) => void;
    const promessaDelete = new Promise<Response>((resolve) => {
      resolverDelete = resolve;
    });

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        respostaJson({
          sucesso: true,
          dados: [
            {
              id: 'a-1',
              nome: 'Prof. Carla Andrade',
              email: 'carla@gmail.com',
              crea: 'CREA-PE 123456-D',
              criadoEm: '2026-11-01T10:00:00Z',
              auxiliares: [],
            },
          ],
        }),
      )
      .mockImplementationOnce(() => promessaDelete);

    const usuario = userEvent.setup();
    renderizarPowerUser();

    const botaoDesativar = await screen.findByRole('button', { name: 'Desativar Acesso' });
    await usuario.click(botaoDesativar);

    expect(screen.getByRole('button', { name: 'Desativando...' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolverDelete(respostaJson({ sucesso: true, mensagem: 'Desativado' }));

    await waitFor(() => {
      expect(screen.queryByText('Prof. Carla Andrade')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Analista "Prof. Carla Andrade" desativado com sucesso.');
  });
});
