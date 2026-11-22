import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AnalistaProvider } from '@/context/AnalistaContext';
import { AnalistaDashboardPage } from './AnalistaDashboardPage';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';

function TelaAnaliseDestino() {
  const { protocolo } = useParams();
  return <p>Análise aberta: {protocolo}</p>;
}

const AMOSTRAS_SERVIDOR = [
  {
    protocolo: 'LAB-2026-001',
    cpfCliente: '52998224725',
    solicitante: 'Antônio Lima',
    propriedade: 'Sítio Boa Vista',
    status: 'PENDENTE',
    versao: 1,
    criadoEm: '2026-11-10T10:00:00Z',
    dataRecebimento: '2026-11-10',
  },
  {
    protocolo: 'LAB-2026-002',
    cpfCliente: '52998224725',
    solicitante: 'Maria Santos',
    propriedade: 'Fazenda Esperança',
    status: 'AGUARDANDO_HOMOLOGACAO',
    versao: 2,
    criadoEm: '2026-11-05T10:00:00Z',
    dataRecebimento: '2026-11-05',
  },
  {
    protocolo: 'LAB-2026-003',
    cpfCliente: '52998224725',
    solicitante: 'João Concluído',
    propriedade: 'Sítio Primavera',
    status: 'CONCLUIDO',
    versao: 3,
    criadoEm: '2026-11-01T10:00:00Z',
    dataRecebimento: '2026-11-01',
  },
];

function renderizarDashboard(role: 'ANALISTA' | 'AUXILIAR' = 'ANALISTA') {
  sessionStorage.setItem(
    CHAVE_AUTH,
    JSON.stringify({
      token: tokenComExpiracao(3600),
      role,
      nome: role === 'ANALISTA' ? 'Carla Andrade' : 'Lucas Auxiliar',
      email: role === 'ANALISTA' ? 'carla@lab.br' : 'lucas@lab.br',
      crea: role === 'ANALISTA' ? 'CREA-PE 123456-D' : null,
      escopoAnalistaId: 'carla@lab.br',
      responsavelNome: 'Carla Andrade',
      responsavelCrea: 'CREA-PE 123456-D',
    }),
  );

  return render(
    <MemoryRouter initialEntries={['/analista']}>
      <AuthProvider>
        <AnalistaProvider>
          <Routes>
            <Route path="/analista" element={<AnalistaDashboardPage />} />
            <Route path="/analista/analises/:protocolo" element={<TelaAnaliseDestino />} />
          </Routes>
        </AnalistaProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AnalistaDashboardPage', () => {
  it('lista amostras pendentes e concluídas, filtra por situação, busca e limpa filtros', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const texto = String(url);
      if (texto.endsWith('/usuarios/auxiliares')) {
        return respostaJson({ sucesso: true, dados: [] });
      }
      return respostaJson({ sucesso: true, dados: AMOSTRAS_SERVIDOR });
    });

    const usuario = userEvent.setup();
    renderizarDashboard('ANALISTA');

    expect(await screen.findByText('LAB-2026-001')).toBeInTheDocument();
    expect(screen.getByText('LAB-2026-002')).toBeInTheDocument();
    expect(screen.getByText('LAB-2026-003')).toBeInTheDocument();
    expect(screen.getByText('Cálculos processados. Falta homologar.')).toBeInTheDocument();

    // Filtra apenas por Aguardando homologação
    const grupoFiltro = screen.getByRole('group', { name: 'Filtrar por situação' });
    await usuario.click(within(grupoFiltro).getByRole('button', { name: /Aguardando homologação/ }));

    expect(screen.queryByText('LAB-2026-001')).not.toBeInTheDocument();
    expect(screen.getByText('LAB-2026-002')).toBeInTheDocument();

    // Busca sem resultado e limpa filtros
    const camposBusca = screen.getAllByLabelText('Buscar amostras');
    await usuario.type(camposBusca[0], 'Inexistente');
    expect(screen.getByText(/Nenhuma amostra pendente encontrada para “Inexistente”/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('LAB-2026-001')).toBeInTheDocument();
    expect(screen.getByText('LAB-2026-002')).toBeInTheDocument();
  });

  it('abre modal de nova amostra, trata erro 409 e cria amostra navegando para análise', async () => {
    let chamadasPost = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const texto = String(url);
      if (texto.endsWith('/usuarios/auxiliares')) {
        return respostaJson({ sucesso: true, dados: [] });
      }
      if (texto.endsWith('/laudos') && init?.method === 'POST') {
        chamadasPost += 1;
        if (chamadasPost === 1) {
          return respostaJson({ detail: { mensagem: 'Protocolo já existe' } }, 409);
        }
        const corpo = JSON.parse(String(init.body)) as { protocolo: string; cliente_nome: string; propriedade: string };
        return respostaJson(
          {
            sucesso: true,
            mensagem: 'Criado',
            dados: {
              protocolo: corpo.protocolo,
              cliente_nome: corpo.cliente_nome,
              propriedade: corpo.propriedade,
              status: 'PENDENTE',
              versao: 1,
              criadoEm: '2026-11-22T12:00:00Z',
            },
          },
          201,
        );
      }
      return respostaJson({ sucesso: true, dados: [] });
    });

    const usuario = userEvent.setup();
    renderizarDashboard('ANALISTA');

    await usuario.click(screen.getByRole('button', { name: /Registrar Nova Análise/ }));
    const dialog = await screen.findByRole('dialog');

    await usuario.click(within(dialog).getByRole('button', { name: 'Preencher dados de teste' }));
    const protocoloPreenchido = (within(dialog).getByLabelText(/Protocolo/) as HTMLInputElement).value;

    // 1ª tentativa retorna 409
    await usuario.click(within(dialog).getByRole('button', { name: 'Continuar para o Registro' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      `Já existe uma amostra com o protocolo ${protocoloPreenchido}`,
    );

    // 2ª tentativa cria com sucesso e navega
    await usuario.click(within(dialog).getByRole('button', { name: 'Continuar para o Registro' }));
    expect(await screen.findByText(`Análise aberta: ${protocoloPreenchido}`)).toBeInTheDocument();
  });

  it('gerencia auxiliares apenas para ANALISTA e oculta a seção para AUXILIAR', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const texto = String(url);
      if (texto.endsWith('/usuarios/auxiliares') && (!init?.method || init.method === 'GET')) {
        return respostaJson({
          sucesso: true,
          dados: [{ id: 'aux-1', nome: 'Maria Aux', email: 'maria.aux@gmail.com', criadoEm: '2026-11-01' }],
        });
      }
      if (texto.endsWith('/usuarios/auxiliares') && init?.method === 'POST') {
        return respostaJson(
          { id: 'aux-2', nome: 'Pedro Aux', email: 'pedro@gmail.com', criadoEm: '2026-11-22' },
          201,
        );
      }
      if (texto.includes('/usuarios/auxiliares/') && init?.method === 'DELETE') {
        return respostaJson({ sucesso: true, mensagem: 'Removido' });
      }
      return respostaJson({ sucesso: true, dados: [] });
    });

    const usuario = userEvent.setup();
    const viewAnalista = renderizarDashboard('ANALISTA');

    expect(await screen.findByText('Maria Aux')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Nome do Auxiliar'), 'Pedro Aux');
    await usuario.type(screen.getByLabelText(/Conta Google \(Gmail\) do Auxiliar/), 'PEDRO@GMAIL.COM');
    await usuario.click(screen.getByRole('button', { name: /Adicionar Auxiliar/ }));

    expect(await screen.findByText('Pedro Aux')).toBeInTheDocument();

    const botoesDesativar = screen.getAllByRole('button', { name: 'Desativar Auxiliar' });
    await usuario.click(botoesDesativar[0]);

    await waitFor(() => {
      expect(screen.queryByText('Pedro Aux')).not.toBeInTheDocument();
    });

    viewAnalista.unmount();

    // Para AUXILIAR a seção não é renderizada
    renderizarDashboard('AUXILIAR');
    expect(await screen.findByText(/Auxiliar de Carla Andrade \(CREA-PE 123456-D\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Equipe · Contas Auxiliares/)).not.toBeInTheDocument();
  });
});
