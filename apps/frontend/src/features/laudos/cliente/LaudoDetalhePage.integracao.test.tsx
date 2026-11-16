import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { respostaJson, respostaPdf, tokenComExpiracao } from '@/test/utilitarios';
import type { LaudoDetalhe } from '@/types/laudo';
import { LaudoDetalhePage } from './LaudoDetalhePage';

vi.mock('@/config/ambiente', async (original) => {
  const modulo = await original<typeof import('@/config/ambiente')>();
  return { ...modulo, FUNCIONALIDADES: { ...modulo.FUNCIONALIDADES, situacaoClienteServidor: true } };
});

const BASE: LaudoDetalhe = {
  protocolo: '20101.2306',
  status: 'CONCLUIDO',
  cliente: { nome: 'João da Silva', cpfMascarado: '***.982.247-**' },
  propriedade: 'Fazenda Boa Vista',
  dataEmissao: '2026-09-01T10:00:00Z',
  temPdfDisponivel: true,
};

function renderizar(laudo: Partial<LaudoDetalhe>) {
  sessionStorage.setItem(
    'consulta-laudos-solo:auth',
    JSON.stringify({ token: tokenComExpiracao(3600), role: 'CLIENTE', laudo: { ...BASE, ...laudo } }),
  );
  return render(
    <MemoryRouter initialEntries={['/cliente/laudo']}>
      <AuthProvider>
        <Routes>
          <Route path="/cliente" element={<p>Consulta</p>} />
          <Route path="/cliente/laudo" element={<LaudoDetalhePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function prepararDownload() {
  Object.assign(URL, { createObjectURL: () => 'blob:teste', revokeObjectURL: () => undefined });
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
}

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

describe('laudo do cliente com o servidor', () => {
  it('duplo clique no download faz uma única requisição', async () => {
    prepararDownload();
    let liberar: (resposta: Response) => void = () => undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>((resolve) => (liberar = resolve)),
    );
    const usuario = userEvent.setup();
    renderizar({});
    await usuario.dblClick(screen.getByRole('button', { name: /Baixar laudo/ }));
    liberar(respostaPdf());
    expect(await screen.findByText(/Download iniciado/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aviso de PDF indisponível sai com transição e o download é confirmado na nova tentativa', async () => {
    prepararDownload();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ detail: { mensagem: 'Arquivo não encontrado.' } }, 404))
      .mockResolvedValueOnce(respostaPdf());
    const usuario = userEvent.setup();
    renderizar({});
    await usuario.click(screen.getByRole('button', { name: /Baixar laudo/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('PDF ainda não disponível');

    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText(/Download iniciado/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const saindo = document.querySelector('.estado-bloco--saindo');
    expect(saindo).toHaveAttribute('aria-hidden', 'true');
    await waitFor(() => expect(document.querySelector('.estado-bloco--saindo')).toBeNull());
  });

  it('emitido sem PDF continua consultando e avisa quando o PDF é liberado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respostaJson({ sucesso: true, laudo: { ...BASE, temPdfDisponivel: true } }));
    renderizar({ temPdfDisponivel: false });
    expect(screen.getByText(/o PDF ainda está sendo preparado/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('O PDF do laudo foi liberado. Você já pode baixar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar laudo/ })).toBeEnabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resposta inválida na atualização não tira o cliente da tela do laudo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ sucesso: true }));
    const usuario = userEvent.setup();
    renderizar({ status: 'EM_ANALISE', temPdfDisponivel: false });
    await usuario.click(screen.getByRole('button', { name: 'Atualizar situação' }));
    expect(await screen.findByText('O servidor enviou uma resposta inválida.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Análise em andamento' })).toBeInTheDocument();
  });

  it('PDF corrompido mostra aviso de formato e não salva arquivo', async () => {
    const clique = prepararDownload();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaPdf('<html>erro</html>'));
    const usuario = userEvent.setup();
    renderizar({});
    await usuario.click(screen.getByRole('button', { name: /Baixar laudo/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não é um PDF válido/);
    expect(clique).not.toHaveBeenCalled();
  });

  it('laudo malformado guardado na sessão é normalizado ao reabrir', () => {
    sessionStorage.setItem(
      'consulta-laudos-solo:auth',
      JSON.stringify({
        token: tokenComExpiracao(3600),
        role: 'CLIENTE',
        laudo: { protocolo: 123, status: 'CONCLUIDO', cliente: null, temPdfDisponivel: true },
      }),
    );
    render(
      <MemoryRouter initialEntries={['/cliente/laudo']}>
        <AuthProvider>
          <Routes>
            <Route path="/cliente/laudo" element={<LaudoDetalhePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getAllByText('123').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/undefined|null|\[object Object\]/);
  });
});
