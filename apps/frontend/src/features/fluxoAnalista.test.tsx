import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Rotas } from '@/App';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';

const SESSAO = { token: tokenComExpiracao(3600), role: 'ANALISTA', nome: 'Ana Analista', email: 'ana@ifpe.edu.br' };

function analiseApi(status = 'EM_ANALISE') {
  return {
    sucesso: true,
    dados: {
      protocolo: 'LAB-1',
      status,
      versao: 1,
      amostra: { solicitante: 'Maria Souza', propriedade: 'Sítio Alegria' },
      dadosBancada: { quimica: {}, granulometria: {}, calibracao: null },
    },
  };
}

type Rota = (url: URL, init: RequestInit) => Response | undefined;

function simularApi(...rotas: Rota[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada, init) => {
    const url = new URL(String(entrada));
    for (const rota of rotas) {
      const resposta = rota(url, init ?? {});
      if (resposta) return resposta;
    }
    return respostaJson({ sucesso: false, mensagem: 'Não mapeado' }, 500);
  });
}

function renderizar(rota: string, sessao?: object) {
  if (sessao) sessionStorage.setItem('consulta-laudos-solo:auth', JSON.stringify(sessao));
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <Rotas />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('navegação inicial', () => {
  it('home oferece os dois acessos', async () => {
    renderizar('/');
    expect(await screen.findByRole('link', { name: /Sou cliente/ })).toHaveAttribute('href', '/cliente');
    expect(screen.getByRole('link', { name: /Sou analista/ })).toHaveAttribute('href', '/analista/login');
  });

  it('rota protegida sem sessão leva ao login do analista', async () => {
    renderizar('/analista');
    expect(await screen.findByRole('heading', { name: /Módulo do Analista/ })).toBeInTheDocument();
  });
});

describe('login do analista', () => {
  it('entra com o botão de teste e abre o painel', async () => {
    simularApi((url, init) =>
      url.pathname.endsWith('/auth/google') && init.method === 'POST'
        ? respostaJson({
            sucesso: true,
            token: tokenComExpiracao(3600),
            tipoToken: 'Bearer',
            usuario: { nome: 'Ana Analista', email: 'ana@ifpe.edu.br', role: 'ANALISTA' },
          })
        : undefined,
    );
    const usuario = userEvent.setup();
    renderizar('/analista/login');
    await usuario.click(await screen.findByRole('button', { name: /analista de teste/ }));
    expect(await screen.findByRole('heading', { name: /Painel do\s*Analista/ })).toBeInTheDocument();
    expect(screen.getByText('Ana Analista')).toBeInTheDocument();
  });

  it('mostra mensagem específica quando a conta não é autorizada (403)', async () => {
    simularApi((url) =>
      url.pathname.endsWith('/auth/google')
        ? respostaJson({ sucesso: false, mensagem: 'proibido' }, 403)
        : undefined,
    );
    const usuario = userEvent.setup();
    renderizar('/analista/login');
    await usuario.click(await screen.findByRole('button', { name: /analista de teste/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não tem acesso ao módulo do analista/);
  });

  it('redireciona para o painel quando já existe sessão de analista', async () => {
    simularApi();
    renderizar('/analista/login', SESSAO);
    expect(await screen.findByRole('heading', { name: /Painel do\s*Analista/ })).toBeInTheDocument();
  });
});

describe('painel do analista', () => {
  it('cadastra amostra, navega para a análise e mostra os dados carregados', async () => {
    const api = simularApi(
      (url, init) =>
        url.pathname.endsWith('/laudos') && init.method === 'POST'
          ? respostaJson({ sucesso: true, mensagem: 'ok', dados: {} }, 201)
          : undefined,
      (url) => (url.pathname.includes('/analise') ? respostaJson(analiseApi()) : undefined),
    );
    const usuario = userEvent.setup();
    renderizar('/analista', SESSAO);

    expect(await screen.findByText(/Nenhum laudo pendente/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum laudo homologado ainda/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Registrar Nova Análise/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Preencher dados de teste' }));
    await usuario.click(screen.getByRole('button', { name: /Continuar para o Registro/ }));

    expect(
      await screen.findByRole('heading', { name: /Gestão de Análises Laboratoriais/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Análise em andamento/)).toBeInTheDocument();
    expect(api.mock.calls.some(([u]) => String(u).includes('/analise'))).toBe(true);
    expect(screen.getAllByText('Maria Souza').length).toBeGreaterThan(0);

    await usuario.click(screen.getByRole('button', { name: /Voltar para o Painel do Analista/ }));
    expect(await screen.findByRole('heading', { name: /Painel do\s*Analista/ })).toBeInTheDocument();
    const filtros = screen.getByRole('group', { name: 'Filtrar por situação' });
    expect(within(filtros).getAllByRole('button').length).toBeGreaterThan(1);
  });

  it('mostra erro do servidor ao cadastrar protocolo duplicado (409)', async () => {
    simularApi((url, init) =>
      url.pathname.endsWith('/laudos') && init.method === 'POST'
        ? respostaJson({ sucesso: false, mensagem: 'duplicado' }, 409)
        : undefined,
    );
    const usuario = userEvent.setup();
    renderizar('/analista', SESSAO);
    await usuario.click(await screen.findByRole('button', { name: /Registrar Nova Análise/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Preencher dados de teste' }));
    await usuario.click(screen.getByRole('button', { name: /Continuar para o Registro/ }));
    expect(await screen.findByText(/Já existe uma amostra com o protocolo/)).toBeInTheDocument();
  });
});

describe('tela de análise', () => {
  it('mostra "não encontrada" quando o servidor responde 404', async () => {
    simularApi(() => respostaJson({ sucesso: false, mensagem: 'nao' }, 404));
    renderizar('/analista/analises/XYZ', SESSAO);
    expect(await screen.findByText('Amostra não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar para o Painel/ })).toHaveAttribute('href', '/analista');
  });

  it('mostra erro e permite tentar novamente', async () => {
    let tentativas = 0;
    simularApi(() => {
      tentativas += 1;
      return tentativas === 1 ? respostaJson({ sucesso: false, mensagem: 'falhou' }, 500) : respostaJson(analiseApi());
    });
    const usuario = userEvent.setup();
    renderizar('/analista/analises/LAB-1', SESSAO);
    expect(await screen.findByText('Não foi possível carregar a amostra')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect((await screen.findAllByText('Maria Souza')).length).toBeGreaterThan(0);
  });

  it('exige calibração e TFSA antes de processar', async () => {
    simularApi((url) => (url.pathname.includes('/analise') ? respostaJson(analiseApi()) : undefined));
    const usuario = userEvent.setup();
    renderizar('/analista/analises/LAB-1', SESSAO);
    expect(await screen.findByText(/Análise em andamento: ainda não terminou/)).toBeInTheDocument();
    const botoes = screen.getAllByRole('button', { name: /Processar|Calcular/ });
    await usuario.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(screen.getAllByText(/curva de calibração|peso da amostra/).length).toBeGreaterThan(0));
  });

  it('abre direto na homologação quando o laudo já foi concluído', async () => {
    simularApi((url) => (url.pathname.includes('/analise') ? respostaJson(analiseApi('CONCLUIDO')) : undefined));
    renderizar('/analista/analises/LAB-1', SESSAO);
    expect((await screen.findAllByText('Maria Souza')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Análise em andamento/)).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  function Quebra(): never {
    throw new Error('boom');
  }

  it('mostra tela de erro genérica', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Quebra />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Recarregar página/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para o início/ })).toHaveAttribute('href', '/');
    expect(document.title).toMatch(/Erro inesperado/);
  });

  it('identifica falha ao carregar módulo como nova versão do sistema', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function QuebraModulo(): never {
      throw new Error('Failed to fetch dynamically imported module: /x.js');
    }
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <QuebraModulo />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText(/atualizado enquanto você navegava/)).toBeInTheDocument();
  });

  it('reinicia quando a chave de reinício muda', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let quebrar = true;
    function Condicional() {
      if (quebrar) throw new Error('boom');
      return <p>ok</p>;
    }
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary chaveReinicio="a">
          <Condicional />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    quebrar = false;
    rerender(
      <MemoryRouter>
        <ErrorBoundary chaveReinicio="b">
          <Condicional />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});
