import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { useAuth } from '@/context/AuthContext';
import { useGoogleIdentity } from '@/hooks/useGoogleIdentity';
import { ApiError } from '@/services/apiClient';
import { LayoutEntrada, SetaVelocidade } from '@/features/home/LayoutEntrada';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export function LoginAnalistaPage() {
  const { entrarComCredenciais, entrarComGoogle } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errosCampos, setErrosCampos] = useState<{ username?: string; password?: string }>({});
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [autenticando, setAutenticando] = useState(false);

  async function aoEntrarLocal(evento: FormEvent) {
    evento.preventDefault();
    const encontrados: { username?: string; password?: string } = {};
    if (!username.trim()) encontrados.username = 'Informe o usuário.';
    if (!password) encontrados.password = 'Informe a senha.';
    setErrosCampos(encontrados);
    if (encontrados.username || encontrados.password) return;

    setAutenticando(true);
    setMensagemErro(null);
    try {
      const role = await entrarComCredenciais(username, password);
      navigate(role === 'POWER_USER' ? '/power-user' : '/analista', { replace: true });
    } catch (erro) {
      setMensagemErro(erro instanceof ApiError ? erro.message : 'Usuário ou senha inválidos.');
    } finally {
      setAutenticando(false);
    }
  }

  async function aoReceberCredencial(idToken: string) {
    setAutenticando(true);
    setMensagemErro(null);
    try {
      const role = await entrarComGoogle(idToken);
      navigate(role === 'POWER_USER' ? '/power-user' : '/analista', { replace: true });
    } catch (erro) {
      setMensagemErro(
        erro instanceof ApiError
          ? erro.message
          : 'Não foi possível entrar com essa conta Google. Verifique se seu e-mail foi autorizado.',
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
        Entre com sua conta Google autorizada para registrar análises e homologar laudos técnicos, ou utilize suas
        credenciais administrativas locais.
      </p>

      {alerta && (
        <div className="entrada-alerta" role="alert">
          <span>{alerta}</span>
        </div>
      )}

      <div className="entrada-google">
        <div ref={containerRef} className="entrada-google__botao" aria-busy={autenticando} />
      </div>

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
