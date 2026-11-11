import { useState as useEstado } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { NaoEncontradoPage } from '@/features/erros/NaoEncontradoPage';
import { ConsultaLaudoPage } from '@/features/auth/cliente/ConsultaLaudoPage';
import { LaudoDetalhePage } from '@/features/laudos/cliente/LaudoDetalhePage';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';
import { HomologacaoView } from '@/features/laudos/analista/HomologacaoView';
import { DADOS_ANALISE_VAZIOS, type DadosAnalise } from '@/features/laudos/analista/tipos';
import { RegistroForm } from '@/features/laudos/analista/RegistroForm';

const LAUDO = {
  protocolo: '20101.2306',
  status: 'CONCLUIDO',
  cliente: { nome: 'João da Silva', cpfMascarado: '***.982.247-**' },
  propriedade: 'Fazenda Boa Vista',
  dataEmissao: '2026-09-01T10:00:00Z',
  parametrosSolo: { ph: 6.2, materiaOrganica: '2.8%', fosforo: '15 mg/dm³', potassio: '0.35 cmolc/dm³' },
  temPdfDisponivel: true,
};

function renderizar(rotaInicial: string, sessao?: object) {
  if (sessao) sessionStorage.setItem('consulta-laudos-solo:auth', JSON.stringify(sessao));
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<p>Início</p>} />
          <Route path="/cliente" element={<ConsultaLaudoPage />} />
          <Route element={<ProtectedRoute perfil="CLIENTE" redirectTo="/cliente" />}>
            <Route path="/cliente/laudo" element={<LaudoDetalhePage />} />
          </Route>
          <Route path="/analista/login" element={<p>Login do analista</p>} />
          <Route element={<ProtectedRoute perfil="ANALISTA" redirectTo="/analista/login" />}>
            <Route path="/analista" element={<p>Painel</p>} />
          </Route>
          <Route path="*" element={<NaoEncontradoPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('rotas', () => {
  it('mostra a página 404 para endereço inexistente e atualiza o título', () => {
    renderizar('/nao-existe');
    expect(screen.getByRole('heading', { name: /Página não\s*encontrada/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao início/ })).toHaveAttribute('href', '/');
    expect(document.title).toMatch(/^Página não encontrada/);
  });

  it('redireciona para o login quando não há sessão', () => {
    renderizar('/analista');
    expect(screen.getByText('Login do analista')).toBeInTheDocument();
  });

  it('redireciona quando o perfil não confere ou o token expirou', () => {
    renderizar('/analista', { token: tokenComExpiracao(600), role: 'CLIENTE', laudo: LAUDO });
    expect(screen.getByText('Login do analista')).toBeInTheDocument();
  });

  it('libera a rota com sessão válida do perfil certo', () => {
    renderizar('/analista', { token: tokenComExpiracao(600), role: 'ANALISTA', nome: 'Ana' });
    expect(screen.getByText('Painel')).toBeInTheDocument();
  });

  it('descarta sessão armazenada com token vencido', () => {
    renderizar('/analista', { token: tokenComExpiracao(-10), role: 'ANALISTA' });
    expect(screen.getByText('Login do analista')).toBeInTheDocument();
    expect(sessionStorage.getItem('consulta-laudos-solo:auth')).toBeNull();
  });
});

describe('consulta do cliente', () => {
  it('valida protocolo e CPF antes de enviar', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const usuario = userEvent.setup();
    renderizar('/cliente');
    await usuario.click(screen.getByRole('button', { name: /Consultar Laudo/ }));
    expect(screen.getByText('Informe o número do protocolo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Protocolo')).toHaveFocus();

    await usuario.type(screen.getByLabelText('Protocolo'), '20101.2306');
    await usuario.type(screen.getByLabelText('CPF do titular'), '11111111111');
    await usuario.click(screen.getByRole('button', { name: /Consultar Laudo/ }));
    expect(screen.getByText(/CPF inválido/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aplica máscara no CPF, envia os dados normalizados e abre o laudo', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respostaJson({ sucesso: true, token: tokenComExpiracao(600), tipoToken: 'Bearer', laudo: LAUDO }));
    const usuario = userEvent.setup();
    renderizar('/cliente');
    await usuario.type(screen.getByLabelText('Protocolo'), ' 20101.2306 ');
    await usuario.type(screen.getByLabelText('CPF do titular'), '52998224725');
    expect(screen.getByLabelText('CPF do titular')).toHaveValue('529.982.247-25');
    await usuario.click(screen.getByRole('button', { name: /Consultar Laudo/ }));

    expect(await screen.findByRole('heading', { name: /Laudo Técnico/ })).toBeInTheDocument();
    const corpo = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(corpo).toEqual({ protocolo: '20101.2306', cpf: '52998224725' });
  });

  it('mostra mensagem neutra quando protocolo e CPF não conferem', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({ detail: { mensagem: 'Dados de consulta inválidos ou laudo indisponível.' } }, 401),
    );
    const usuario = userEvent.setup();
    renderizar('/cliente');
    await usuario.type(screen.getByLabelText('Protocolo'), '20101.2306');
    await usuario.type(screen.getByLabelText('CPF do titular'), '52998224725');
    await usuario.click(screen.getByRole('button', { name: /Consultar Laudo/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não encontramos um laudo/);
  });
});

describe('PDF do laudo', () => {
  it('mostra estado de PDF ainda não disponível quando o servidor responde 404 e permite tentar de novo', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respostaJson({ detail: { mensagem: 'Arquivo PDF do laudo não encontrado.' } }, 404));
    const usuario = userEvent.setup();
    renderizar('/cliente/laudo', { token: tokenComExpiracao(600), role: 'CLIENTE', laudo: LAUDO });

    await usuario.click(screen.getByRole('button', { name: /Baixar laudo/ }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('PDF ainda não disponível');
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.queryByText(/Indicadores de fertilidade/)).not.toBeInTheDocument();
    expect(screen.queryByText('6.20')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('encerra a sessão do cliente quando o servidor responde 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ detail: { mensagem: 'Sessão expirada.' } }, 401));
    const usuario = userEvent.setup();
    renderizar('/cliente/laudo', { token: tokenComExpiracao(600), role: 'CLIENTE', laudo: LAUDO });
    await usuario.click(screen.getByRole('button', { name: /Baixar laudo/ }));
    expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Consultar\s*Laudo/ })).toBeInTheDocument();
  });

  it('desabilita o download quando o laudo ainda não tem PDF', () => {
    renderizar('/cliente/laudo', {
      token: tokenComExpiracao(600),
      role: 'CLIENTE',
      laudo: { ...LAUDO, status: 'EM_ANALISE', temPdfDisponivel: false },
    });
    expect(screen.getByRole('button', { name: 'PDF ainda não disponível' })).toBeDisabled();
    expect(screen.getByText(/está sendo analisada/)).toBeInTheDocument();
    expect(screen.getByText('Aguardando emissão')).toBeInTheDocument();
  });
});

describe('componentes acessíveis', () => {
  it('Select funciona só com teclado', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <Select
        ariaLabel="Ordenar"
        value="a"
        opcoes={[
          { valor: 'a', rotulo: 'Primeiro' },
          { valor: 'b', rotulo: 'Segundo' },
        ]}
        onChange={aoMudar}
      />,
    );
    const combo = screen.getByRole('combobox', { name: 'Ordenar' });
    combo.focus();
    await usuario.keyboard('{ArrowDown}');
    expect(combo).toHaveAttribute('aria-expanded', 'true');
    await usuario.keyboard('{ArrowDown}{Enter}');
    expect(aoMudar).toHaveBeenCalledWith('b');
    expect(combo).toHaveFocus();
  });

  it('Modal prende o foco, fecha com Escape e devolve o foco', async () => {
    const usuario = userEvent.setup();
    function Exemplo() {
      const [aberto, setAberto] = useEstado(false);
      return (
        <>
          <button type="button" onClick={() => setAberto(true)}>
            Abrir
          </button>
          <Modal isOpen={aberto} onClose={() => setAberto(false)} title="Confirmar">
            <button type="button">Primeiro</button>
            <button type="button">Último</button>
          </Modal>
        </>
      );
    }
    render(<Exemplo />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    await usuario.click(abrir);
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });
});

describe('laudo de homologação', () => {
  it('mostra Na e K convertidos para cmolc/dm³, como o relatório oficial', () => {
    render(
      <HomologacaoView
        dados={{ ...DADOS_ANALISE_VAZIOS, quimica: { ...DADOS_ANALISE_VAZIOS.quimica, sodioMgL: 12, potassioMgL: 45 } }}
        responsavel="Analista"
        onVoltarParaEdicao={() => undefined}
        onHomologar={async () => ({ ok: true, simulado: true })}
      />,
    );
    const linhaNa = screen.getByRole('cell', { name: 'Sódio (Na)' }).closest('tr');
    const linhaK = screen.getByRole('cell', { name: 'Potássio (K)' }).closest('tr');
    expect(linhaNa).toHaveTextContent('0.05cmolc/dm³');
    expect(linhaK).toHaveTextContent('0.12cmolc/dm³');
    expect(screen.queryByText('mg/L')).not.toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: /Classe Textural/ })).toHaveLength(1);
    expect(screen.queryByText(/Grupo Textural/)).not.toBeInTheDocument();
  });
});

describe('registro da acidez potencial', () => {
  it('mostra o fator do NaOH, calcula (leitura × fator) − branco e avisa fator inválido', async () => {
    const usuario = userEvent.setup();
    function Exemplo() {
      const [dados, setDados] = useEstado<DadosAnalise>({
        ...DADOS_ANALISE_VAZIOS,
        quimica: { ...DADOS_ANALISE_VAZIOS.quimica, acidezPotencial: { medido: 4.8, branco: 3.2, fator: 1 } },
      });
      return <RegistroForm dados={dados} onChange={setDados} onProcessar={() => undefined} />;
    }
    render(<Exemplo />);
    const resultadoHAl = () => screen.getByText('H⁺+Al³⁺').closest('div');
    expect(resultadoHAl()).toHaveTextContent('1.60');
    expect(screen.queryByText(/leitura × fator − branco/)).not.toBeInTheDocument();
    const fator = screen.getByLabelText('Fator NaOH');
    await usuario.clear(fator);
    await usuario.type(fator, '0');
    expect(await screen.findByText(/deve ser maior que zero/)).toBeInTheDocument();
    await usuario.clear(fator);
    await usuario.type(fator, '1,5');
    expect(resultadoHAl()).toHaveTextContent('4.00');
  });
});

describe('homologação bloqueada sem processamento', () => {
  it('desabilita o botão e explica que falta processar', () => {
    render(
      <HomologacaoView
        dados={DADOS_ANALISE_VAZIOS}
        responsavel="Analista"
        processada={false}
        onVoltarParaEdicao={() => undefined}
        onHomologar={async () => ({ ok: true, simulado: true })}
      />,
    );
    expect(screen.getByRole('button', { name: /Assinar Digitalmente/ })).toBeDisabled();
    expect(screen.getByText(/ainda não foi processada/)).toBeInTheDocument();
  });
});
