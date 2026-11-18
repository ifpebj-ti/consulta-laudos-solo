import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { useAuth } from '@/context/AuthContext';
import { tokenExpirado } from '@/lib/token';
import { useGoogleIdentity } from '@/hooks/useGoogleIdentity';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { ApiError } from '@/services/apiClient';
import { LayoutEntrada, SetaVelocidade } from '@/features/home/LayoutEntrada';
import { destinoAposLogin } from '@/routes/rotas';
import { GOOGLE_CLIENT_ID } from '@/config/ambiente';

const TOKEN_MOCK_DEV = 'mock-dev-token';

function mensagemDeFalha(erro: unknown): string {
  if (erro instanceof ApiError && erro.status === 403) {
    return 'Esta conta não tem acesso ao módulo do analista. Entre com o e-mail institucional autorizado pelo laboratório.';
  }
  if (erro instanceof ApiError && erro.message) return erro.message;
  return 'Não foi possível entrar com essa conta Google. Verifique se seu e-mail foi autorizado.';
}

export function LoginAnalistaPage() {
  useTituloPagina('Entrar como analista');
  const { session, entrarComCredenciais, entrarComGoogle, motivoUltimaSaida, limparMotivoSaida } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errosCampos, setErrosCampos] = useState<{ username?: string; password?: string }>({});
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

  async function aoEntrarLocal(evento: FormEvent) {
    evento.preventDefault();
    const encontrados: { username?: string; password?: string } = {};
    if (!username.trim()) encontrados.username = 'Informe o usuário.';
    if (!password) encontrados.password = 'Informe a senha.';
    setErrosCampos(encontrados);
    if (encontrados.username || encontrados.password) return;

    setAutenticando(true);
    setMensagemErro(null);
    limparMotivoSaida();
    try {
      const role = await entrarComCredenciais(username, password);
      navigate(role === 'POWER_USER' ? '/power-user' : destino, { replace: true });
    } catch (erro) {
      if (montadoRef.current) {
        setMensagemErro(erro instanceof ApiError ? erro.message : 'Usuário ou senha inválidos.');
      }
    } finally {
      if (montadoRef.current) setAutenticando(false);
    }
  }

  const aoReceberCredencial = useCallback(
    async (idToken: string) => {
      setAutenticando(true);
      setMensagemErro(null);
      limparMotivoSaida();
      try {
        const role = await entrarComGoogle(idToken);
        navigate(role === 'POWER_USER' ? '/power-user' : destino, { replace: true });
      } catch (erro) {
        if (montadoRef.current) setMensagemErro(mensagemDeFalha(erro));
      } finally {
        if (montadoRef.current) setAutenticando(false);
      }
    },
    [destino, entrarComGoogle, limparMotivoSaida, navigate],
  );

  const { containerRef, erro: erroGoogle, tentarNovamente } = useGoogleIdentity(GOOGLE_CLIENT_ID, aoReceberCredencial);

  if (session && !tokenExpirado(session.token)) {
    if (session.role === 'POWER_USER') return <Navigate to="/power-user" replace />;
    if (session.role === 'ANALISTA' || session.role === 'AUXILIAR') return <Navigate to={destino} replace />;
  }

  const avisoSessao =
    motivoUltimaSaida === 'sessao_expirada'
      ? 'Sua sessão expirou. Entre novamente para continuar.'
      : motivoUltimaSaida === 'sessao_encerrada'
        ? 'Sua sessão foi encerrada. Entre novamente para continuar.'
        : null;
  const alerta = mensagemErro ?? avisoSessao ?? (import.meta.env.DEV ? null : erroGoogle);

  return (
    <LayoutEntrada tituloId="login-titulo" voltar>
      <span className="entrada-etapa">02 · Sou analista</span>
      <h1 id="login-titulo" className="home-titulo entrada-titulo">
        <span>Módulo do Analista</span>
        <span className="home-titulo__destaque">Entrar</span>
      </h1>
      <p className="entrada-texto">
        Entre com sua conta Google autorizada para registrar análises e homologar laudos técnicos, ou utilize suas
        credenciais administrativas locais.
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

      <div className="entrada-divisor">Acesso local (PowerUser)</div>

      <form className="entrada-form" onSubmit={aoEntrarLocal} noValidate>
        <div className={`entrada-campo ${errosCampos.username ? 'entrada-campo--invalido' : ''}`.trim()}>
          <span className="entrada-campo__rotulo" aria-hidden="true">
            Usuário
          </span>
          <input
            type="text"
            placeholder="Usuário"
            aria-label="Usuário"
            autoComplete="username"
            aria-invalid={errosCampos.username ? true : undefined}
            aria-describedby={errosCampos.username ? 'login-username-erro' : undefined}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setErrosCampos((atual) => ({ ...atual, username: undefined }));
            }}
            disabled={autenticando}
            required
          />
          <MensagemErroCampo id="login-username-erro" mensagem={errosCampos.username} />
        </div>

        <div className={`entrada-campo ${errosCampos.password ? 'entrada-campo--invalido' : ''}`.trim()}>
          <span className="entrada-campo__rotulo" aria-hidden="true">
            Senha
          </span>
          <input
            type="password"
            placeholder="Senha"
            aria-label="Senha"
            autoComplete="current-password"
            aria-invalid={errosCampos.password ? true : undefined}
            aria-describedby={errosCampos.password ? 'login-password-erro' : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrosCampos((atual) => ({ ...atual, password: undefined }));
            }}
            disabled={autenticando}
            required
          />
          <MensagemErroCampo id="login-password-erro" mensagem={errosCampos.password} />
        </div>

        <Button type="submit" disabled={autenticando}>
          {autenticando ? 'Autenticando...' : 'Entrar com Usuário e Senha'}
          <SetaVelocidade />
        </Button>
      </form>
    </LayoutEntrada>
  );
}
