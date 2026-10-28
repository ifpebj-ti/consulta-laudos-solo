import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useGoogleIdentity } from '@/hooks/useGoogleIdentity';
import { ApiError } from '@/services/apiClient';
import { LayoutEntrada } from '@/features/home/LayoutEntrada';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export function LoginAnalistaPage() {
  const { entrarComGoogle } = useAuth();
  const navigate = useNavigate();
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [autenticando, setAutenticando] = useState(false);

  async function aoReceberCredencial(idToken: string) {
    setAutenticando(true);
    setMensagemErro(null);
    try {
      await entrarComGoogle(idToken);
      navigate('/analista', { replace: true });
    } catch (erro) {
      setMensagemErro(
        erro instanceof ApiError
          ? erro.message
          : 'Não foi possível entrar com essa conta Google. Use seu e-mail institucional (@ifpe.edu.br).',
      );
    } finally {
      setAutenticando(false);
    }
  }

  const { containerRef, erro: erroGoogle } = useGoogleIdentity(GOOGLE_CLIENT_ID, aoReceberCredencial);
  const alerta = mensagemErro ?? erroGoogle;

  return (
    <LayoutEntrada tituloId="login-titulo" voltar>
      <span className="entrada-etapa">02 · Sou analista</span>
      <h1 id="login-titulo" className="home-titulo entrada-titulo">
        <span>Módulo do Analista</span>
        <span className="home-titulo__destaque">Entrar</span>
      </h1>
      <p className="entrada-texto">
        Entre com sua conta Google institucional para registrar análises e homologar laudos técnicos.
      </p>

      {alerta && (
        <div className="entrada-alerta" role="alert">
          <span>{alerta}</span>
        </div>
      )}

      <div className="entrada-google">
        <div ref={containerRef} className="entrada-google__botao" aria-busy={autenticando} />
      </div>

      <div className="entrada-divisor">Acesso institucional</div>

      <div className="entrada-restricao">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" width="18" height="18" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>
          Restrito a contas <strong>@ifpe.edu.br</strong> de professores e técnicos do Laboratório de Solos.
        </span>
      </div>

      <p className="entrada-nota">Em caso de dúvidas sobre o acesso, procure a coordenação do curso.</p>
    </LayoutEntrada>
  );
}