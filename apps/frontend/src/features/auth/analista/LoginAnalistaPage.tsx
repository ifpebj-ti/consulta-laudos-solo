import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { tokenExpirado } from '@/lib/token';
import { useGoogleIdentity } from '@/hooks/useGoogleIdentity';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { ApiError } from '@/services/apiClient';
import { LayoutEntrada } from '@/features/home/LayoutEntrada';
import { destinoAposLogin } from '@/routes/rotas';
import { GOOGLE_CLIENT_ID } from '@/config/ambiente';

const TOKEN_MOCK_DEV = 'mock-dev-token';

function mensagemDeFalha(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 403) {
    return 'Esta conta não tem acesso ao módulo do analista. Entre com o e-mail institucional autorizado pelo laboratório.';
  }
  if (erro instanceof ApiError && erro.message) return erro.message;
  return 'Não foi possível entrar com essa conta Google. Use seu e-mail institucional (@ifpe.edu.br).';
}

export function LoginAnalistaPage() {
  useTituloPagina('Entrar como analista');
  const { session, entrarComGoogle, motivoUltimaSaida, limparMotivoSaida } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [autenticando, setAutenticando] = useState(false);
  const montadoRef = useRef(true);
  const destino = destinoAposLogin(location.state, '/analista', '/analista');

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const aoReceberCredencial = useCallback(
    async (idToken: string) => {
      setAutenticando(true);
      setMensagemErro(null);
      limparMotivoSaida();
      try {
        await entrarComGoogle(idToken);
        navigate(destino, { replace: true });
      } catch (erro) {
        if (montadoRef.current) setMensagemErro(mensagemDeFalha(erro));
      } finally {
        if (montadoRef.current) setAutenticando(false);
      }
    },
    [destino, entrarComGoogle, limparMotivoSaida, navigate],
  );

  const { containerRef, erro: erroGoogle, tentarNovamente } = useGoogleIdentity(GOOGLE_CLIENT_ID, aoReceberCredencial);

  if (session?.role === 'ANALISTA' && !tokenExpirado(session.token)) {
    return <Navigate to={destino} replace />;
  }

  const avisoSessao =
    motivoUltimaSaida === 'sessao_expirada' ? 'Sua sessão expirou. Entre novamente para continuar.' : null;
  const alerta = mensagemErro ?? avisoSessao ?? (import.meta.env.DEV ? null : erroGoogle);

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

      <div aria-live="assertive">
        {alerta && (
          <div className="entrada-alerta" role="alert">
            <span>{alerta}</span>
            {alerta === erroGoogle && GOOGLE_CLIENT_ID && (
              <button type="button" className="entrada-alerta__acao" onClick={tentarNovamente}>
                Tentar carregar novamente
              </button>
            )}
          </div>
        )}
      </div>

      <div className="entrada-google">
        <div ref={containerRef} className="entrada-google__botao" aria-busy={autenticando} />
        {autenticando && (
          <span className="entrada-google__status" role="status">
            Validando sua conta...
          </span>
        )}
      </div>

      {import.meta.env.DEV && (
        <button
          type="button"
          className="entrada-teste"
          onClick={() => void aoReceberCredencial(TOKEN_MOCK_DEV)}
          disabled={autenticando}
        >
          Entrar como analista de teste (somente desenvolvimento)
        </button>
      )}

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
