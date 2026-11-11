import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import { registrarManipuladorNaoAutorizado } from '@/services/apiClient';
import type { LaudoDetalhe } from '@/types/laudo';
import type { Role } from '@/types/auth';
import { expiracaoDoToken, tokenExpirado } from '@/lib/token';

const STORAGE_KEY = 'consulta-laudos-solo:auth';

export interface AuthSession {
  token: string;
  role: Role;
  nome?: string;
  email?: string;
  protocolo?: string;
  laudo?: LaudoDetalhe;
  consultadoEm?: string;
}

export type MotivoSaida = 'manual' | 'sessao_expirada';

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
    return sessao;
  } catch {
    return null;
  }
}

function gravarSessao(sessao: AuthSession | null) {
  try {
    if (sessao) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(lerSessaoArmazenada);
  const [motivoUltimaSaida, setMotivoUltimaSaida] = useState<MotivoSaida | null>(null);

  const salvarSessao = useCallback((proxima: AuthSession) => {
    gravarSessao(proxima);
    setMotivoUltimaSaida(null);
    setSession(proxima);
  }, []);

  const sair = useCallback((motivo: MotivoSaida = 'manual') => {
    gravarSessao(null);
    setMotivoUltimaSaida(motivo);
    setSession(null);
  }, []);

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
