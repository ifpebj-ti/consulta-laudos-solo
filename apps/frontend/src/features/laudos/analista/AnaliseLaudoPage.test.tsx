import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AnalistaProvider } from '@/context/AnalistaContext';
import { AnaliseLaudoPage } from './AnaliseLaudoPage';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';

function dadosAnaliseServidor(status = 'EM_ANALISE', versao = 2) {
  return {
    sucesso: true,
    dados: {
      protocolo: 'LAB-2026-0142',
      status,
      versao,
      amostra: {
        solicitante: 'Antônio S. Lima',
        propriedade: 'Sítio Boa Vista',
        localizacao: 'Belo Jardim - PE',
        areaIdentificacao: 'Talhão 1',
        profundidadeColeta: '0-20 cm',
        cultivo: 'Milho',
        dataRecebimento: '2026-11-01',
        tipoAnalise: 'fisico_quimica',
        responsavelNome: 'Prof. Carla Andrade',
        responsavelCrea: 'CREA-PE 123456-D',
      },
      dadosBancada: {
        quimica: {
          ph: 5.4,
          fosforoAbsBruta: 0.612,
          fatorDiluicaoFosforo: 10,
          sodioMgL: 12,
          potassioMgL: 45,
          calcio: { medido: 2.1, branco: 0 },
          magnesio: { medido: 0.85, branco: 0 },
          aluminio: { medido: 0.3, branco: 0 },
          acidezPotencial: { medido: 3.2, branco: 0, fator: 1 },
        },
        granulometria: {
          tfsa: 20,
          areiaBecker: 15.9312,
          areiaBeckerVazio: 4.492,
          argilaBecker: 4.5824,
          argilaBeckerVazio: 4.4899,
          naohBecker: 4.479,
          naohBeckerVazio: 4.4711,
        },
        calibracao: {
          a: 0.033,
          b: 0.019,
          r2: 0.9998,
          pontos: [
            { x: 0, y: 0.02 },
            { x: 5, y: 0.18 },
            { x: 10, y: 0.35 },
          ],
        },
      },
    },
  };
}

function renderizarAnalise(protocolo = 'LAB-2026-0142') {
  sessionStorage.setItem(
    CHAVE_AUTH,
    JSON.stringify({
      token: tokenComExpiracao(3600),
      role: 'ANALISTA',
      nome: 'Prof. Carla Andrade',
      email: 'carla@lab.br',
      crea: 'CREA-PE 123456-D',
    }),
  );

  return render(
    <MemoryRouter initialEntries={[`/analista/analises/${protocolo}`]}>
      <AuthProvider>
        <AnalistaProvider>
          <Routes>
            <Route path="/analista" element={<p>Painel do Analista</p>} />
            <Route path="/analista/analises/:protocolo" element={<AnaliseLaudoPage />} />
          </Routes>
        </AnalistaProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AnaliseLaudoPage', () => {
  it('carrega diretamente pela URL aproveitando metadados completos sem exibir aviso falso', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/laudos')) {
        return respostaJson({ sucesso: true, dados: [] });
      }
      return respostaJson(dadosAnaliseServidor());
    });

    renderizarAnalise();

    expect(await screen.findByText('Antônio S. Lima')).toBeInTheDocument();
    expect(screen.getByText('Belo Jardim - PE')).toBeInTheDocument();
    expect(screen.getByText('Talhão 1')).toBeInTheDocument();
    expect(screen.getByText('0-20 cm')).toBeInTheDocument();
    expect(screen.getByText('Milho')).toBeInTheDocument();
    expect(screen.getByText('01/11/2026')).toBeInTheDocument();
    expect(screen.getByText('16/11/2026')).toBeInTheDocument();
    expect(
      screen.queryByText(/Os demais dados do cadastro \(localização, área, cultivo, prazo\) ainda não são enviados/),
    ).not.toBeInTheDocument();
  });

  it('exibe estado 404 e permite tentar novamente quando ocorre erro de rede/servidor', async () => {
    let tentativasAnalise = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const texto = String(url);
      if (texto.endsWith('/laudos')) return respostaJson({ sucesso: true, dados: [] });
      if (texto.includes('/NAO-EXISTE/')) {
        return respostaJson({ detail: { mensagem: 'Não encontrado' } }, 404);
      }
      tentativasAnalise += 1;
      if (tentativasAnalise === 1) {
        return respostaJson({ detail: { mensagem: 'Erro temporário' } }, 503);
      }
      return respostaJson(dadosAnaliseServidor());
    });

    const view404 = renderizarAnalise('NAO-EXISTE');
    expect(await screen.findByText('Amostra não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o Painel do Analista' })).toHaveAttribute('href', '/analista');
    view404.unmount();

    const usuario = userEvent.setup();
    renderizarAnalise('LAB-2026-0142');
    expect(await screen.findByText('Não foi possível carregar a amostra')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Formulário de Entrada de Dados Laboratoriais')).toBeInTheDocument();
  });

  it('processa cálculos com sucesso e transiciona para a aba de homologação', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const texto = String(url);
      if (texto.endsWith('/laudos')) return respostaJson({ sucesso: true, dados: [] });
      if (texto.endsWith('/analise')) return respostaJson(dadosAnaliseServidor());
      if (texto.endsWith('/analise/processar') && init?.method === 'POST') {
        return respostaJson({
          sucesso: true,
          mensagem: 'Processado',
          dados: {
            protocolo: 'LAB-2026-0142',
            status: 'AGUARDANDO_HOMOLOGACAO',
            novaVersao: 3,
            calculosOficiais: {
              valoresLiquidos: {},
              conversoes: {},
              complexoSortivo: {},
              granulometria: {},
              fosforo: {},
            },
            processadoEm: '2026-11-22T12:00:00Z',
          },
        });
      }
      return respostaJson({ sucesso: true, dados: [] });
    });

    const usuario = userEvent.setup();
    renderizarAnalise();

    const botaoProcessar = await screen.findByRole('button', { name: /Salvar e Processar Cálculos/ });
    await usuario.click(botaoProcessar);

    expect(await screen.findByRole('button', { name: /Assinar Digitalmente e Liberar Laudo/ })).toBeInTheDocument();
    expect(screen.getByText('Aguardando homologação')).toBeInTheDocument();
  });

  it('exibe alerta de conflito de versão quando o servidor responde 409 ao processar', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const texto = String(url);
      if (texto.endsWith('/laudos')) return respostaJson({ sucesso: true, dados: [] });
      if (texto.endsWith('/analise')) return respostaJson(dadosAnaliseServidor());
      if (texto.endsWith('/analise/processar') && init?.method === 'POST') {
        return respostaJson({ detail: { mensagem: 'Conflito de versão.' } }, 409);
      }
      return respostaJson({ sucesso: true, dados: [] });
    });

    const usuario = userEvent.setup();
    renderizarAnalise();

    const botaoProcessar = await screen.findByRole('button', { name: /Salvar e Processar Cálculos/ });
    await usuario.click(botaoProcessar);

    await waitFor(() => {
      expect(screen.getByText('Conflito de edição detectado!')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Recarregar Dados' })).toBeInTheDocument();
  });
});
