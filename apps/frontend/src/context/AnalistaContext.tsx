import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DADOS_ANALISE_VAZIOS,
  type AmostraRegistro,
  type DadosAnalise,
  type Identificacao,
  type StatusAmostra,
} from '@/features/laudos/analista/tipos';
import { useAuth } from '@/context/AuthContext';
import { chavePersistenciaAnalista } from '@/lib/persistenciaAnalista';

interface AnalistaContextValue {
  amostras: AmostraRegistro[];
  amostraAtual: DadosAnalise | null;
  statusAmostraAtual: StatusAmostra | null;
  criarAmostra: (identificacao: Identificacao) => void;
  retomarAmostra: (protocolo: string) => void;
  atualizarAmostraAtual: (dados: DadosAnalise) => void;
  concluirAmostraAtual: () => void;
  marcarAguardandoHomologacao: () => void;
}

const AnalistaContext = createContext<AnalistaContextValue | undefined>(undefined);

const PERSISTIR = import.meta.env.DEV;

function carregarAmostrasSalvas(chave: string | null): AmostraRegistro[] {
  if (!PERSISTIR || !chave) return [];
  try {
    const bruto = localStorage.getItem(chave);
    const lista = bruto ? (JSON.parse(bruto) as AmostraRegistro[]) : [];
    if (!Array.isArray(lista)) return [];
    return lista.map((amostra) => ({
      ...amostra,
      dados: {
        ...amostra.dados,
        quimica: { ...DADOS_ANALISE_VAZIOS.quimica, ...amostra.dados?.quimica },
      },
    }));
  } catch {
    return [];
  }
}

export function AnalistaProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const chave = chavePersistenciaAnalista(session?.email ?? session?.nome);
  const [amostras, setAmostras] = useState<AmostraRegistro[]>(() => carregarAmostrasSalvas(chave));
  const [protocoloAtual, setProtocoloAtual] = useState<string | null>(null);

  useEffect(() => {
    if (!PERSISTIR || !chave) return;
    try {
      localStorage.setItem(chave, JSON.stringify(amostras));
    } catch {
      return;
    }
  }, [amostras, chave]);

  const registroAtual = useMemo(
    () => amostras.find((a) => a.dados.identificacao.protocolo === protocoloAtual) ?? null,
    [amostras, protocoloAtual],
  );
  const amostraAtual = registroAtual?.dados ?? null;
  const statusAmostraAtual = registroAtual?.status ?? null;

  const criarAmostra = useCallback((identificacao: Identificacao) => {
    const dados: DadosAnalise = { ...DADOS_ANALISE_VAZIOS, identificacao };
    setAmostras((atual) => [...atual, { dados, status: 'nao_iniciado', criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() }]);
    setProtocoloAtual(identificacao.protocolo);
  }, []);

  const retomarAmostra = useCallback((protocolo: string) => {
    setProtocoloAtual(protocolo);
  }, []);

  const atualizarAmostraAtual = useCallback((dados: DadosAnalise) => {
    setAmostras((atual) =>
      atual.map((amostra) => {
        if (amostra.dados.identificacao.protocolo !== dados.identificacao.protocolo) return amostra;
        if (JSON.stringify(amostra.dados) === JSON.stringify(dados)) return amostra;
        return {
          ...amostra,
          dados,
          atualizadaEm: new Date().toISOString(),
          status:
            amostra.status === 'nao_iniciado' || amostra.status === 'aguardando_homologacao' ? 'em_andamento' : amostra.status,
        };
      }),
    );
  }, []);
  const concluirAmostraAtual = useCallback(() => {
    setAmostras((atual) =>
      atual.map((amostra) =>
        amostra.dados.identificacao.protocolo === protocoloAtual ? { ...amostra, status: 'concluido' } : amostra,
      ),
    );
  }, [protocoloAtual]);

  const marcarAguardandoHomologacao = useCallback(() => {
    setAmostras((atual) =>
      atual.map((amostra) =>
        amostra.dados.identificacao.protocolo === protocoloAtual && amostra.status !== 'concluido'
          ? { ...amostra, status: 'aguardando_homologacao', atualizadaEm: new Date().toISOString() }
          : amostra,
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
      marcarAguardandoHomologacao,
    }),
    [amostras, amostraAtual, statusAmostraAtual, criarAmostra, retomarAmostra, atualizarAmostraAtual, concluirAmostraAtual, marcarAguardandoHomologacao],
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
