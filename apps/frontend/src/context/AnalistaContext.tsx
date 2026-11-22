import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { analiseService, type LaudoResumoItem } from '@/services/analiseService';
import { calcularPrevisaoEntrega } from '@/features/laudos/analista/statusAmostra';
import {
  DADOS_ANALISE_VAZIOS,
  type AmostraRegistro,
  type DadosAnalise,
  type Identificacao,
  type StatusAmostra,
} from '@/features/laudos/analista/tipos';
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

function mapearStatusBackend(statusBackend: string, statusLocal?: StatusAmostra): StatusAmostra {
  if (statusLocal === 'concluido' || statusBackend === 'CONCLUIDO') return 'concluido';
  if (statusBackend === 'AGUARDANDO_HOMOLOGACAO') return 'aguardando_homologacao';
  if (statusBackend === 'EM_ANALISE') return 'em_andamento';
  return statusLocal ?? 'nao_iniciado';
}

function resumoParaAmostraRegistro(item: LaudoResumoItem, existente?: AmostraRegistro): AmostraRegistro {
  const dataRec = item.dataRecebimento || existente?.dados.identificacao.dataRecebimento || item.criadoEm.slice(0, 10);
  const prazo = existente?.dados.identificacao.prazo || calcularPrevisaoEntrega(dataRec);

  const identificacao: Identificacao = {
    protocolo: item.protocolo,
    cpfCliente: item.cpfCliente || existente?.dados.identificacao.cpfCliente || '',
    dataRecebimento: dataRec,
    prazo,
    tipoAnalise: item.tipoAnalise ?? existente?.dados.identificacao.tipoAnalise ?? 'fisico_quimica',
    solicitante: item.solicitante,
    dataEmissao: existente?.dados.identificacao.dataEmissao ?? '',
    propriedade: item.propriedade,
    localizacao: item.localizacao ?? existente?.dados.identificacao.localizacao ?? '',
    areaIdentificacao: item.areaIdentificacao ?? existente?.dados.identificacao.areaIdentificacao ?? '',
    areaHectares: item.areaHectares ?? existente?.dados.identificacao.areaHectares ?? '',
    profundidadeColeta: item.profundidadeColeta ?? existente?.dados.identificacao.profundidadeColeta ?? '',
    cultivo: item.cultivo ?? existente?.dados.identificacao.cultivo ?? '',
    culturaExistente: item.culturaExistente ?? existente?.dados.identificacao.culturaExistente ?? '',
    email: item.email ?? existente?.dados.identificacao.email ?? '',
    telefone: item.telefone ?? existente?.dados.identificacao.telefone ?? '',
  };

  return {
    dados: {
      ...(existente?.dados ?? DADOS_ANALISE_VAZIOS),
      identificacao,
    },
    status: mapearStatusBackend(item.status, existente?.status),
    criadaEm: item.criadoEm,
    atualizadaEm: existente?.atualizadaEm,
  };
}

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
  const chave = chavePersistenciaAnalista(session?.escopoAnalistaId ?? session?.email ?? session?.nome);
  const [amostras, setAmostras] = useState<AmostraRegistro[]>(() => carregarAmostrasSalvas(chave));
  const [protocoloAtual, setProtocoloAtual] = useState<string | null>(null);

  useEffect(() => {
    setAmostras(carregarAmostrasSalvas(chave));
    setProtocoloAtual(null);
  }, [chave]);

  useEffect(() => {
    if (!PERSISTIR || !chave) return;
    try {
      localStorage.setItem(chave, JSON.stringify(amostras));
    } catch {
      return;
    }
  }, [amostras, chave]);

  useEffect(() => {
    if (!session?.token) return;
    let ativo = true;

    analiseService
      .listarAmostras(session.token)
      .then((res) => {
        if (!ativo || !res.sucesso) return;
        setAmostras((atuais) => {
          const porProtocolo = new Map(atuais.map((a) => [a.dados.identificacao.protocolo, a]));
          return res.dados.map((item) =>
            resumoParaAmostraRegistro(item, porProtocolo.get(item.protocolo)),
          );
        });
      })
      .catch(() => {
        // mantém cache local caso offline
      });

    return () => {
      ativo = false;
    };
  }, [session?.token, chave]);

  const registroAtual = useMemo(
    () => amostras.find((a) => a.dados.identificacao.protocolo === protocoloAtual) ?? null,
    [amostras, protocoloAtual],
  );
  const amostraAtual = registroAtual?.dados ?? null;
  const statusAmostraAtual = registroAtual?.status ?? null;

  const criarAmostra = useCallback((identificacao: Identificacao) => {
    const dados: DadosAnalise = { ...DADOS_ANALISE_VAZIOS, identificacao };
    const agora = new Date().toISOString();
    setAmostras((atual) => [
      { dados, status: 'nao_iniciado', criadaEm: agora, atualizadaEm: agora },
      ...atual.filter((a) => a.dados.identificacao.protocolo !== identificacao.protocolo),
    ]);
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
