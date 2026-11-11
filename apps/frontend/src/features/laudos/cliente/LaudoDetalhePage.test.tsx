import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';
import type { LaudoDetalhe } from '@/types/laudo';
import { LaudoDetalhePage } from './LaudoDetalhePage';

const BASE: LaudoDetalhe = {
  protocolo: '20101.2306',
  status: 'CONCLUIDO',
  cliente: { nome: 'João da Silva', cpfMascarado: '***.982.247-**' },
  propriedade: 'Fazenda Boa Vista',
  dataEmissao: '2026-09-01T10:00:00Z',
  parametrosSolo: { ph: 6.2 },
  temPdfDisponivel: true,
};

function renderizar(laudo: Partial<LaudoDetalhe>) {
  sessionStorage.setItem(
    'consulta-laudos-solo:auth',
    JSON.stringify({ token: tokenComExpiracao(600), role: 'CLIENTE', laudo: { ...BASE, ...laudo } }),
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

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('laudo do cliente por situação', () => {
  it('não mostra números da análise em nenhum estado', () => {
    renderizar({});
    expect(screen.queryByText('6.20')).not.toBeInTheDocument();
    expect(screen.queryByText(/Indicadores/)).not.toBeInTheDocument();
  });

  it('amostra recebida: explica que a análise não começou, mostra etapas e não libera download', () => {
    renderizar({ status: 'PENDENTE', dataEmissao: null, temPdfDisponivel: false });
    expect(screen.getByRole('heading', { name: 'Análise ainda não iniciada' })).toBeInTheDocument();
    expect(screen.getByText('Recebida').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Previsão de entrega ainda não informada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF ainda não disponível' })).toBeDisabled();
    expect(screen.getByText('Aguardando emissão')).toBeInTheDocument();
  });

  it('em andamento: mostra a etapa atual e a previsão de entrega informada', () => {
    renderizar({ status: 'AGUARDANDO_HOMOLOGACAO', temPdfDisponivel: false, dataPrevistaEntrega: '2999-01-31' });
    expect(screen.getByText('Homologação').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Previsto para 31/01/2999.')).toBeInTheDocument();
  });

  it('previsão vencida: pede contato em vez de mostrar data passada como previsão', () => {
    renderizar({ status: 'EM_ANALISE', temPdfDisponivel: false, dataPrevistaEntrega: '2000-01-01' });
    expect(screen.getByText(/já passou/)).toBeInTheDocument();
  });

  it('cancelado ou com pendência: orienta contato e bloqueia o download', () => {
    renderizar({ status: 'RECUSADO', temPdfDisponivel: false });
    expect(screen.getByRole('heading', { name: 'Laudo cancelado' })).toBeInTheDocument();
    expect(screen.getByText(/Entre em contato com o Laboratório de Solos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download indisponível' })).toBeDisabled();
    expect(screen.queryByText('Previsão de entrega ainda não informada.')).not.toBeInTheDocument();
  });

  it('status desconhecido cai em estado seguro', () => {
    renderizar({ status: 'QUALQUER_COISA', temPdfDisponivel: true });
    expect(screen.getAllByText('Situação em atualização').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Baixar laudo/ })).not.toBeInTheDocument();
  });

  it('emitido sem PDF: explica que o arquivo está sendo preparado', () => {
    renderizar({ temPdfDisponivel: false });
    expect(screen.getByText(/o PDF ainda está sendo preparado/)).toBeInTheDocument();
  });

  it('campos vazios mostram travessão e data ausente mostra Aguardando emissão', () => {
    renderizar({ propriedade: null, dataEmissao: null, cliente: { nome: '', cpfMascarado: '***.982.247-**' } });
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Aguardando emissão')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/undefined|null/);
  });

  it('laudo retificado avisa a versão atualizada', () => {
    renderizar({ versao: 2, atualizadoEm: '2026-10-05T12:00:00Z' });
    expect(screen.getByText(/Versão atualizada em 05\/10\/2026/)).toBeInTheDocument();
  });

  it('sem conexão: avisa e desabilita o download', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    renderizar({});
    expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar laudo/ })).toBeDisabled();
  });

  it('limite de downloads (429) informa o tempo de espera e leva o foco à mensagem', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({ error: 'Rate limit exceeded' }, 429, { 'Retry-After': '30' }),
    );
    const usuario = userEvent.setup();
    renderizar({});
    await usuario.click(screen.getByRole('button', { name: /Baixar laudo/ }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Aguarde 30 segundos');
    await waitFor(() => expect(alerta).toHaveFocus());
  });

  it('PDF com formato inesperado permite tentar novamente', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ ok: true }));
    const usuario = userEvent.setup();
    renderizar({});
    await usuario.click(screen.getByRole('button', { name: /Baixar laudo/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não é um PDF válido/);
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  });

  it('copia o protocolo com feedback', async () => {
    const usuario = userEvent.setup();
    renderizar({});
    await usuario.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(await navigator.clipboard.readText()).toBe('20101.2306');
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });
});
