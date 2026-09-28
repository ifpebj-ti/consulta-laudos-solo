import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DADOS_ANALISE_VAZIOS,
  type AmostraRegistro,
  type DadosAnalise,
  type Identificacao,
} from '@/features/laudos/analista/tipos';

interface AnalistaContextValue {
  amostras: AmostraRegistro[];
  amostraAtual: DadosAnalise | null;
  criarAmostra: (identificacao: Identificacao) => void;
  retomarAmostra: (protocolo: string) => void;
  atualizarAmostraAtual: (dados: DadosAnalise) => void;
  concluirAmostraAtual: () => void;
}

const AnalistaContext = createContext<AnalistaContextValue | undefined>(undefined);

/**
 * Estado da área do Analista mantido em memória, enquanto a persistência das
 * análises não é integrada à API — some ao recarregar a página. Guarda o DadosAnalise completo
 * de cada amostra (não só a identificação) para permitir sair do Registro e
 * voltar depois sem perder o que já foi digitado.
 */
export function AnalistaProvider({ children }: { children: ReactNode }) {
  const [amostras, setAmostras] = useState<AmostraRegistro[]>([]);
  const [protocoloAtual, setProtocoloAtual] = useState<string | null>(null);

  const amostraAtual = useMemo(
    () => amostras.find((a) => a.dados.identificacao.protocolo === protocoloAtual)?.dados ?? null,
    [amostras, protocoloAtual],
  );

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
    () => ({ amostras, amostraAtual, criarAmostra, retomarAmostra, atualizarAmostraAtual, concluirAmostraAtual }),
    [amostras, amostraAtual, criarAmostra, retomarAmostra, atualizarAmostraAtual, concluirAmostraAtual],
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
