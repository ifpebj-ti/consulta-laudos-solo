import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useGoogleIdentity } from '@/hooks/useGoogleIdentity';
import { ApiError } from '@/services/apiClient';
import './LoginAnalistaPage.css';

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
      navigate('/analista/analises', { replace: true });
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
    <>
      <TopBar />
      <main className="login-shell">
        <div className="login-card">
          <div className="login-card__faixa"></div>
          <div className="login-card__corpo">
            <span className="login-card__badge">Acesso do Professor</span>
            <h1>Laboratório de Solos</h1>
            <p className="login-card__subtitulo">
              Entre com sua conta Google institucional para registrar análises e homologar laudos técnicos.
            </p>

            {alerta && (
              <div className="login-alerta is-visible" role="alert">
                <span>{alerta}</span>
              </div>
            )}

            <div className="login-form">
              <div ref={containerRef} className="login-google-btn" aria-busy={autenticando} />

              {!GOOGLE_CLIENT_ID && (
                <div className="login-dev-mock">
                  <span className="login-dev-mock__tag">Somente ambiente de dev</span>
                  <Button
                    type="button"
                    variant="ghost"
                    block
                    disabled={autenticando}
                    onClick={() => aoReceberCredencial('mock-dev-token')}
                  >
                    {autenticando ? 'Entrando...' : 'Entrar como analista (modo dev)'}
                  </Button>
                  <p className="login-dev-mock__aviso">
                    Usa o mock de autenticação do próprio backend (idToken "mock-dev-token"). Só funciona com o
                    backend em <code>ENVIRONMENT=dev</code> e <code>ENABLE_MOCK_AUTH=True</code> — os padrões locais.
                  </p>
                </div>
              )}

              <div className="divisor-institucional">Acesso institucional</div>

              <div className="login-restricao">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>
                  Restrito a contas <strong>@ifpe.edu.br</strong> de professores e técnicos do Laboratório de Solos.
                </span>
              </div>
            </div>

            <p className="login-card__rodape">Em caso de dúvidas sobre o acesso, procure a coordenação do curso.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
