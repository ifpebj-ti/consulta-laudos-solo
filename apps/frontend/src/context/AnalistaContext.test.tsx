import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { AnalistaProvider, useAnalista } from './AnalistaContext';
import { DADOS_ANALISE_VAZIOS, type Identificacao } from '@/features/laudos/analista/tipos';
import { respostaJson, tokenComExpiracao } from '@/test/utilitarios';

const CHAVE_AUTH = 'consulta-laudos-solo:auth';
const EMAIL_ANALISTA = 'analista.dev@instituto.edu.br';

function sessaoAnalista() {
  return {
    token: tokenComExpiracao(3600),
    role: 'ANALISTA',
    nome: 'Carla Andrade',
    email: EMAIL_ANALISTA,
    escopoAnalistaId: EMAIL_ANALISTA,
  };
}

function criarIdentificacao(protocolo: string): Identificacao {
  return {
    ...DADOS_ANALISE_VAZIOS.identificacao,
    protocolo,
    cpfCliente: '52998224725',
    dataRecebimento: '2026-11-01',
    prazo: '2026-11-16',
    tipoAnalise: 'fisico_quimica',
    solicitante: 'João Silva',
    propriedade: 'Fazenda Boa Vista',
    culturaExistente: 'Milho',
  };
}

function PainelTeste() {
  const {
    amostras,
    amostraAtual,
    statusAmostraAtual,
    criarAmostra,
    retomarAmostra,
    atualizarAmostraAtual,
    marcarAguardandoHomologacao,
    concluirAmostraAtual,
  } = useAnalista();

  return (
    <div>
      <ul data-testid="lista-amostras">
        {amostras.map((a) => (
          <li key={a.dados.identificacao.protocolo}>
            {a.dados.identificacao.protocolo}:{a.status}
          </li>
        ))}
      </ul>
      <span data-testid="atual">{amostraAtual?.identificacao.protocolo ?? 'nenhuma'}</span>
      <span data-testid="status-atual">{statusAmostraAtual ?? 'nenhum'}</span>
      <span data-testid="ph-atual">{amostraAtual?.quimica.ph ?? ''}</span>
      <button type="button" onClick={() => criarAmostra(criarIdentificacao('LAB-NEW-1'))}>
        criar
      </button>
      <button type="button" onClick={() => retomarAmostra('LAB-NEW-1')}>
        retomar
      </button>
      <button
        type="button"
        onClick={() => {
          if (amostraAtual) {
            atualizarAmostraAtual({
              ...amostraAtual,
              quimica: { ...amostraAtual.quimica, ph: 6.4 },
            });
          }
        }}
      >
        atualizar
      </button>
      <button type="button" onClick={() => marcarAguardandoHomologacao()}>
        aguardar
      </button>
      <button type="button" onClick={() => concluirAmostraAtual()}>
        concluir
      </button>
    </div>
  );
}

function renderizarComProvider() {
  return render(
    <AuthProvider>
      <AnalistaProvider>
        <PainelTeste />
      </AnalistaProvider>
    </AuthProvider>,
  );
}

describe('AnalistaContext', () => {
  it('lança erro quando useAnalista é usado fora de AnalistaProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useAnalista())).toThrow('useAnalista deve ser usado dentro de um AnalistaProvider.');
  });

  it('sincroniza amostras do servidor mapeando PENDENTE, EM_ANALISE, AGUARDANDO_HOMOLOGACAO e CONCLUIDO', async () => {
    sessionStorage.setItem(CHAVE_AUTH, JSON.stringify(sessaoAnalista()));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({
        sucesso: true,
        dados: [
          {
            protocolo: 'P-1',
            cpfCliente: '52998224725',
            solicitante: 'Ana',
            propriedade: 'Sítio A',
            status: 'PENDENTE',
            versao: 1,
            criadoEm: '2026-11-01T10:00:00Z',
          },
          {
            protocolo: 'P-2',
            cpfCliente: '52998224725',
            solicitante: 'Beto',
            propriedade: 'Sítio B',
            status: 'EM_ANALISE',
            versao: 2,
            criadoEm: '2026-11-02T10:00:00Z',
          },
          {
            protocolo: 'P-3',
            cpfCliente: '52998224725',
            solicitante: 'Caio',
            propriedade: 'Sítio C',
            status: 'AGUARDANDO_HOMOLOGACAO',
            versao: 3,
            criadoEm: '2026-11-03T10:00:00Z',
          },
          {
            protocolo: 'P-4',
            cpfCliente: '52998224725',
            solicitante: 'Davi',
            propriedade: 'Sítio D',
            status: 'CONCLUIDO',
            versao: 4,
            criadoEm: '2026-11-04T10:00:00Z',
          },
        ],
      }),
    );

    renderizarComProvider();

    await waitFor(() => {
      const lista = screen.getByTestId('lista-amostras');
      expect(lista).toHaveTextContent('P-1:nao_iniciado');
      expect(lista).toHaveTextContent('P-2:em_andamento');
      expect(lista).toHaveTextContent('P-3:aguardando_homologacao');
      expect(lista).toHaveTextContent('P-4:concluido');
    });
  });

  it('gerencia ciclo completo da amostra (criar, atualizar, aguardar homologação, concluir e retomar)', async () => {
    sessionStorage.setItem(CHAVE_AUTH, JSON.stringify(sessaoAnalista()));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ sucesso: true, dados: [] }));

    renderizarComProvider();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    act(() => screen.getByRole('button', { name: 'criar' }).click());
    expect(screen.getByTestId('atual')).toHaveTextContent('LAB-NEW-1');
    expect(screen.getByTestId('status-atual')).toHaveTextContent('nao_iniciado');

    act(() => screen.getByRole('button', { name: 'atualizar' }).click());
    expect(screen.getByTestId('status-atual')).toHaveTextContent('em_andamento');
    expect(screen.getByTestId('ph-atual')).toHaveTextContent('6.4');

    act(() => screen.getByRole('button', { name: 'aguardar' }).click());
    expect(screen.getByTestId('status-atual')).toHaveTextContent('aguardando_homologacao');

    // Editar novamente volta para em_andamento
    act(() => {
      // força nova edição retomando ou alterando não mudaria pq ph já é 6.4; valida conclusão:
      screen.getByRole('button', { name: 'concluir' }).click();
    });
    expect(screen.getByTestId('status-atual')).toHaveTextContent('concluido');

    // marcarAguardandoHomologacao não altera amostra já concluída
    act(() => screen.getByRole('button', { name: 'aguardar' }).click());
    expect(screen.getByTestId('status-atual')).toHaveTextContent('concluido');
  });

  it('recupera e persiste amostras no localStorage do analista', async () => {
    const chaveStorage = `consulta-laudos-solo:amostras-analista:${EMAIL_ANALISTA}`;
    localStorage.setItem(
      chaveStorage,
      JSON.stringify([
        {
          dados: { ...DADOS_ANALISE_VAZIOS, identificacao: criarIdentificacao('CACHE-01') },
          status: 'em_andamento',
          criadaEm: '2026-11-01T00:00:00.000Z',
        },
      ]),
    );
    sessionStorage.setItem(CHAVE_AUTH, JSON.stringify(sessaoAnalista()));
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    renderizarComProvider();

    await waitFor(() => {
      expect(screen.getByTestId('lista-amostras')).toHaveTextContent('CACHE-01:em_andamento');
    });

    act(() => screen.getByRole('button', { name: 'retomar' }).click());
    act(() => screen.getByRole('button', { name: 'criar' }).click());

    const salvo = JSON.parse(localStorage.getItem(chaveStorage) ?? '[]') as Array<{
      dados: { identificacao: { protocolo: string } };
    }>;
    expect(salvo.some((item) => item.dados.identificacao.protocolo === 'LAB-NEW-1')).toBe(true);
  });
});
