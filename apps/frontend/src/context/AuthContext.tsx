import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { registrarCallbackSessaoExpirada } from '@/services/apiClient';
import type { LaudoDetalhe } from '@/types/laudo';
import type { Role } from '@/types/auth';

const STORAGE_KEY = 'consulta-laudos-solo:auth';

interface AuthSession {
  token: string;
  role: Role;
  nome?: string;
  email?: string;
  protocolo?: string;
  laudo?: LaudoDetalhe;
}

interface AuthContextValue {
  session: AuthSession | null;
  entrarComGoogle: (idToken: string) => Promise<void>;
  entrarComProtocolo: (protocolo: string, cpf: string) => Promise<LaudoDetalhe>;
  sair: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function lerSessaoArmazenada(): AuthSession | null {
  const bruto = sessionStorage.getItem(STORAGE_KEY);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as AuthSession;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(lerSessaoArmazenada);
  const navigate = useNavigate();

  const sair = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  // Registra o interceptor de 401 no apiClient assim que o provider monta.
  // Quando qualquer requisição retornar 401 (token expirado), limpa a sessão
  // e redireciona o usuário para a tela de login correspondente ao seu role.
  useEffect(() => {
    registrarCallbackSessaoExpirada(() => {
      const sessaoAtual = lerSessaoArmazenada();
      const destino = sessaoAtual?.role === 'CLIENTE' ? '/' : '/analista/login';
      sair();
      navigate(destino, { replace: true });
    });
  }, [sair, navigate]);

  const salvarSessao = useCallback((proxima: AuthSession) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(proxima));
    setSession(proxima);
  }, []);

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
      });
      return resposta.laudo;
    },
    [salvarSessao],
  );

  const value = useMemo(
    () => ({ session, entrarComGoogle, entrarComProtocolo, sair }),
    [session, entrarComGoogle, entrarComProtocolo, sair],
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
