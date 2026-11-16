import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { LaudoDetalhe } from '@/types/laudo';
import type { Role } from '@/types/auth';

const STORAGE_KEY = 'consulta-laudos-solo:auth';

interface AuthSession {
  token: string;
  role: Role;
  nome?: string;
  email?: string;
  crea?: string | null;
  escopoAnalistaId?: string | null;
  responsavelNome?: string | null;
  responsavelCrea?: string | null;
  protocolo?: string;
  laudo?: LaudoDetalhe;
}

interface AuthContextValue {
  session: AuthSession | null;
  entrarComCredenciais: (username: string, password: string) => Promise<Role>;
  entrarComGoogle: (idToken: string) => Promise<Role>;
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

  const salvarSessao = useCallback((proxima: AuthSession) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(proxima));
    setSession(proxima);
  }, []);

  const entrarComCredenciais = useCallback(
    async (username: string, password: string): Promise<Role> => {
      const resposta = await authService.loginLocal(username, password);
      const role = resposta.usuario.role;
      salvarSessao({
        token: resposta.token,
        role,
        nome: resposta.usuario.nome,
        email: resposta.usuario.email,
        crea: resposta.usuario.crea,
        escopoAnalistaId: resposta.usuario.escopoAnalistaId ?? resposta.usuario.email,
        responsavelNome: resposta.usuario.responsavelNome ?? resposta.usuario.nome,
        responsavelCrea: resposta.usuario.responsavelCrea ?? resposta.usuario.crea,
      });
      return role;
    },
    [salvarSessao],
  );

  const entrarComGoogle = useCallback(
    async (idToken: string): Promise<Role> => {
      const resposta = await authService.loginGoogle(idToken);
      const role = resposta.usuario.role;
      salvarSessao({
        token: resposta.token,
        role,
        nome: resposta.usuario.nome,
        email: resposta.usuario.email,
        crea: resposta.usuario.crea,
        escopoAnalistaId: resposta.usuario.escopoAnalistaId ?? resposta.usuario.email,
        responsavelNome: resposta.usuario.responsavelNome ?? resposta.usuario.nome,
        responsavelCrea: resposta.usuario.responsavelCrea ?? resposta.usuario.crea,
      });
      return role;
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

  const sair = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, entrarComCredenciais, entrarComGoogle, entrarComProtocolo, sair }),
    [session, entrarComCredenciais, entrarComGoogle, entrarComProtocolo, sair],
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
