import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DADOS_ANALISE_VAZIOS,
  type AmostraRegistro,
  type DadosAnalise,
  type Identificacao,
  type StatusAmostra,
} from '@/features/laudos/analista/tipos';

interface AnalistaContextValue {
  amostras: AmostraRegistro[];
  amostraAtual: DadosAnalise | null;
  statusAmostraAtual: StatusAmostra | null;
  criarAmostra: (identificacao: Identificacao) => void;
  retomarAmostra: (protocolo: string) => void;
  atualizarAmostraAtual: (dados: DadosAnalise) => void;
  concluirAmostraAtual: () => void;
}

const AnalistaContext = createContext<AnalistaContextValue | undefined>(undefined);

/**
 * Só em desenvolvimento: guarda as amostras no localStorage para que testes manuais
 * sobrevivam a recarregar a página ou reabrir o navegador. Em produção continua só
 * em memória (os dados incluem CPF e não devem ficar gravados no navegador).
 */
const CHAVE_PERSISTENCIA_DEV = 'consulta-laudos-solo:amostras-analista';
const PERSISTIR = import.meta.env.DEV;

function carregarAmostrasSalvas(): AmostraRegistro[] {
  if (!PERSISTIR) return [];
  try {
    const bruto = localStorage.getItem(CHAVE_PERSISTENCIA_DEV);
    const lista = bruto ? (JSON.parse(bruto) as AmostraRegistro[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/**
 * Estado da área do Analista mantido em memória, enquanto a persistência das
 * análises não é integrada à API — em produção some ao recarregar a página. Guarda o DadosAnalise completo
 * de cada amostra (não só a identificação) para permitir sair do Registro e
 * voltar depois sem perder o que já foi digitado.
 */
export function AnalistaProvider({ children }: { children: ReactNode }) {
  const [amostras, setAmostras] = useState<AmostraRegistro[]>(carregarAmostrasSalvas);
  const [protocoloAtual, setProtocoloAtual] = useState<string | null>(null);

  useEffect(() => {
    if (!PERSISTIR) return;
    try {
      localStorage.setItem(CHAVE_PERSISTENCIA_DEV, JSON.stringify(amostras));
    } catch {
      // Sem espaço ou armazenamento bloqueado: segue só em memória
    }
  }, [amostras]);

  const registroAtual = useMemo(
    () => amostras.find((a) => a.dados.identificacao.protocolo === protocoloAtual) ?? null,
    [amostras, protocoloAtual],
  );
  const amostraAtual = registroAtual?.dados ?? null;
  const statusAmostraAtual = registroAtual?.status ?? null;

  const criarAmostra = useCallback((identificacao: Identificacao) => {
    const dados: DadosAnalise = { ...DADOS_ANALISE_VAZIOS, identificacao };
    setAmostras((atual) => [...atual, { dados, status: 'nao_iniciado', criadaEm: new Date().toISOString() }]);
    setProtocoloAtual(identificacao.protocolo);
  }, []);

  const retomarAmostra = useCallback((protocolo: string) => {
    setProtocoloAtual(protocolo);
  }, []);

  const atualizarAmostraAtual = useCallback((dados: DadosAnalise) => {
    setAmostras((atual) =>
      atual.map((amostra) =>
        amostra.dados.identificacao.protocolo === dados.identificacao.protocolo
          ? { ...amostra, dados, status: amostra.status === 'nao_iniciado' ? 'em_andamento' : amostra.status }
          : amostra,
      ),
    );
  }, []);

  const concluirAmostraAtual = useCallback(() => {
    setAmostras((atual) =>
      atual.map((amostra) =>
        amostra.dados.identificacao.protocolo === protocoloAtual ? { ...amostra, status: 'concluido' } : amostra,
      ),
    );
  }, [protocoloAtual]);

  const value = useMemo(
    () => ({
      amostras,
      amostraAtual,
      statusAmostraAtual,
      criarAmostra,
      retomarAmostra,
      atualizarAmostraAtual,
      concluirAmostraAtual,
    }),
    [amostras, amostraAtual, statusAmostraAtual, criarAmostra, retomarAmostra, atualizarAmostraAtual, concluirAmostraAtual],
  );

  return <AnalistaContext.Provider value={value}>{children}</AnalistaContext.Provider>;
}

export function useAnalista(): AnalistaContextValue {
  const context = useContext(AnalistaContext);
  if (!context) {
    throw new Error('useAnalista deve ser usado dentro de um AnalistaProvider.');
  }
  return context;
}
