import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import { registrarManipuladorNaoAutorizado, registrarVerificadorSessao } from '@/services/apiClient';
import type { LaudoDetalhe } from '@/types/laudo';
import type { Role } from '@/types/auth';
import { expiracaoDoToken, impressaoDoToken, tokenExpirado } from '@/lib/token';
import { normalizarLaudo } from '@/services/respostasApi';

const STORAGE_KEY = 'consulta-laudos-solo:auth';
const CANAL_SESSAO = 'consulta-laudos-solo:sessao';

interface MensagemSessao {
  tipo: 'saida';
  impressao: string;
}

function abrirCanalSessao(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CANAL_SESSAO);
}

export interface AuthSession {
  token: string;
  role: Role;
  nome?: string;
  email?: string;
  protocolo?: string;
  laudo?: LaudoDetalhe;
  consultadoEm?: string;
}

export type MotivoSaida = 'manual' | 'sessao_expirada' | 'sessao_encerrada';

interface AuthContextValue {
  session: AuthSession | null;
  motivoUltimaSaida: MotivoSaida | null;
  entrarComGoogle: (idToken: string) => Promise<void>;
  entrarComProtocolo: (protocolo: string, cpf: string) => Promise<LaudoDetalhe>;
  sair: (motivo?: MotivoSaida) => void;
  limparMotivoSaida: () => void;
  atualizarLaudo: (laudo: LaudoDetalhe) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sessaoValida(valor: unknown): valor is AuthSession {
  if (!valor || typeof valor !== 'object') return false;
  const sessao = valor as Partial<AuthSession>;
  return typeof sessao.token === 'string' && (sessao.role === 'ANALISTA' || sessao.role === 'CLIENTE');
}

function lerSessaoArmazenada(): AuthSession | null {
  try {
    const bruto = sessionStorage.getItem(STORAGE_KEY);
    if (!bruto) return null;
    const sessao: unknown = JSON.parse(bruto);
    if (!sessaoValida(sessao) || tokenExpirado(sessao.token)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (sessao.laudo !== undefined) {
      try {
        return { ...sessao, laudo: normalizarLaudo(sessao.laudo) };
      } catch {
        return { ...sessao, laudo: undefined };
      }
    }
    return sessao;
  } catch {
    return null;
  }
}

function gravarSessao(sessao: AuthSession | null): boolean {
  try {
    if (sessao) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
    else sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function tokenArmazenado(): string | null | undefined {
  try {
    const bruto = sessionStorage.getItem(STORAGE_KEY);
    if (!bruto) return null;
    const sessao: unknown = JSON.parse(bruto);
    return sessaoValida(sessao) ? sessao.token : null;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(lerSessaoArmazenada);
  const [motivoUltimaSaida, setMotivoUltimaSaida] = useState<MotivoSaida | null>(null);

  const sessaoRef = useRef(session);
  sessaoRef.current = session;
  const persistidaRef = useRef(session !== null);
  const canalRef = useRef<BroadcastChannel | null>(null);

  const salvarSessao = useCallback((proxima: AuthSession) => {
    persistidaRef.current = gravarSessao(proxima);
    sessaoRef.current = proxima;
    setMotivoUltimaSaida(null);
    setSession(proxima);
  }, []);

  const encerrarLocalmente = useCallback((motivo: MotivoSaida) => {
    sessaoRef.current = null;
    gravarSessao(null);
    setMotivoUltimaSaida(motivo);
    setSession(null);
  }, []);

  const sessaoContinuaValida = useCallback(
    (token?: string) => {
      const atual = sessaoRef.current;
      if (!atual) return false;
      if (token !== undefined && token !== atual.token) return false;
      if (!persistidaRef.current) return true;
      const armazenado = tokenArmazenado();
      if (armazenado === undefined || armazenado === atual.token) return true;
      encerrarLocalmente('sessao_encerrada');
      return false;
    },
    [encerrarLocalmente],
  );

  useEffect(() => {
    registrarVerificadorSessao((token) => sessaoContinuaValida(token));
    return () => registrarVerificadorSessao(null);
  }, [sessaoContinuaValida]);

  useEffect(() => {
    const verificar = () => {
      if (document.visibilityState === 'visible') sessaoContinuaValida();
    };
    window.addEventListener('focus', verificar);
    document.addEventListener('visibilitychange', verificar);
    window.addEventListener('pageshow', verificar);
    return () => {
      window.removeEventListener('focus', verificar);
      document.removeEventListener('visibilitychange', verificar);
      window.removeEventListener('pageshow', verificar);
    };
  }, [sessaoContinuaValida]);

  const sair = useCallback(
    (motivo: MotivoSaida = 'manual') => {
      const atual = sessaoRef.current;
      if (atual) {
        const mensagem: MensagemSessao = { tipo: 'saida', impressao: impressaoDoToken(atual.token) };
        canalRef.current?.postMessage(mensagem);
      }
      encerrarLocalmente(motivo);
    },
    [encerrarLocalmente],
  );

  useEffect(() => {
    const canal = abrirCanalSessao();
    canalRef.current = canal;
    if (!canal) return;
    canal.onmessage = (evento: MessageEvent<unknown>) => {
      const dados = evento.data as Partial<MensagemSessao> | null;
      const atual = sessaoRef.current;
      if (dados?.tipo === 'saida' && atual && dados.impressao === impressaoDoToken(atual.token)) {
        encerrarLocalmente('manual');
      }
    };
    return () => {
      canal.close();
      canalRef.current = null;
    };
  }, [encerrarLocalmente]);

  const limparMotivoSaida = useCallback(() => setMotivoUltimaSaida(null), []);

  useEffect(() => {
    registrarManipuladorNaoAutorizado(() => sair('sessao_expirada'));
    return () => registrarManipuladorNaoAutorizado(null);
  }, [sair]);

  useEffect(() => {
    if (!session) return;
    const expiracao = expiracaoDoToken(session.token);
    if (expiracao === null) return;
    const restante = expiracao - Date.now();
    if (restante <= 0) {
      sair('sessao_expirada');
      return;
    }
    const temporizador = window.setTimeout(() => sair('sessao_expirada'), Math.min(restante, 2_147_483_647));
    return () => window.clearTimeout(temporizador);
  }, [session, sair]);

  const entrarComGoogle = useCallback(
    async (idToken: string) => {
      const resposta = await authService.loginGoogle(idToken);
      salvarSessao({
        token: resposta.token,
        role: 'ANALISTA',
        nome: resposta.usuario.nome,
        email: resposta.usuario.email,
      });
    },
    [salvarSessao],
  );

  const entrarComProtocolo = useCallback(
    async (protocolo: string, cpf: string) => {
      const resposta = await authService.loginCliente(protocolo, cpf);
      salvarSessao({
        token: resposta.token,
        role: 'CLIENTE',
        protocolo: resposta.laudo.protocolo,
        laudo: resposta.laudo,
        consultadoEm: new Date().toISOString(),
      });
      return resposta.laudo;
    },
    [salvarSessao],
  );

  const atualizarLaudo = useCallback((laudo: LaudoDetalhe) => {
    setSession((atual) => {
      if (!atual || atual.role !== 'CLIENTE') return atual;
      const proxima = { ...atual, laudo, consultadoEm: new Date().toISOString() };
      gravarSessao(proxima);
      return proxima;
    });
  }, []);

  const value = useMemo(
    () => ({ session, motivoUltimaSaida, entrarComGoogle, entrarComProtocolo, sair, limparMotivoSaida, atualizarLaudo }),
    [session, motivoUltimaSaida, entrarComGoogle, entrarComProtocolo, sair, limparMotivoSaida, atualizarLaudo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }
  return context;
}
