import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import { LayoutEntrada, SetaVelocidade } from '@/features/home/LayoutEntrada';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { formatarCpf, normalizarProtocolo, validarCpf, validarProtocoloConsulta } from '@/lib/documentos';

type Erros = { protocolo?: string; cpf?: string };

const MENSAGEM_DADOS_NAO_CONFEREM =
  'Não encontramos um laudo com esses dados. Confira o protocolo e o CPF do titular; se estiverem corretos, procure o laboratório.';

function descreverFalhaConsulta(erro: unknown): { mensagem: string; podeTentarNovamente: boolean } {
  if (!(erro instanceof ApiError)) return { mensagem: 'Não foi possível consultar o laudo agora. Tente novamente.', podeTentarNovamente: true };
  if (erro.status === 401 || erro.status === 403 || erro.status === 404 || erro.status === 422) {
    return { mensagem: MENSAGEM_DADOS_NAO_CONFEREM, podeTentarNovamente: false };
  }
  if (erro.status === 429) return { mensagem: erro.message, podeTentarNovamente: false };
  return { mensagem: erro.message, podeTentarNovamente: true };
}

export function ConsultaLaudoPage() {
  useTituloPagina('Consultar laudo');
  const { entrarComProtocolo, motivoUltimaSaida, limparMotivoSaida } = useAuth();
  const navigate = useNavigate();
  const [protocolo, setProtocolo] = useState('');
  const [cpf, setCpf] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [falha, setFalha] = useState<{ mensagem: string; podeTentarNovamente: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [erros, setErros] = useState<Erros>({});
  const protocoloRef = useRef<HTMLInputElement>(null);
  const cpfRef = useRef<HTMLInputElement>(null);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const avisoSessao =
    motivoUltimaSaida === 'sessao_expirada' ? 'Sua sessão expirou. Consulte o laudo novamente para continuar.' : null;

  async function aoConsultar(evento: FormEvent) {
    evento.preventDefault();
    if (carregando) return;
    const encontrados: Erros = {
      protocolo: validarProtocoloConsulta(protocolo) ?? undefined,
      cpf: validarCpf(cpf) ?? undefined,
    };
    setErros(encontrados);
    if (encontrados.protocolo) {
      protocoloRef.current?.focus();
      return;
    }
    if (encontrados.cpf) {
      cpfRef.current?.focus();
      return;
    }
    setCarregando(true);
    setFalha(null);
    limparMotivoSaida();
    try {
      await entrarComProtocolo(normalizarProtocolo(protocolo), cpf);
      navigate('/cliente/laudo', { replace: true });
    } catch (erro) {
      if (montadoRef.current) setFalha(descreverFalhaConsulta(erro));
    } finally {
      if (montadoRef.current) setCarregando(false);
    }
  }

  const alerta = falha?.mensagem ?? avisoSessao;

  return (
    <LayoutEntrada tituloId="consulta-titulo" voltar>
      <span className="entrada-etapa">01 · Sou cliente</span>
      <h1 id="consulta-titulo" className="home-titulo entrada-titulo">
        <span>Consultar</span>
        <span className="home-titulo__destaque">Laudo</span>
      </h1>
      <p className="entrada-texto">Informe o Protocolo da amostra e o CPF do titular para acompanhar o andamento.</p>

      <div aria-live="assertive">
        {alerta && (
          <div className="entrada-alerta" role="alert">
            {alerta}
            {falha?.podeTentarNovamente && (
              <button
                type="button"
                className="entrada-alerta__acao"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={carregando}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>

      <form ref={formRef} className="entrada-form" onSubmit={aoConsultar} noValidate aria-busy={carregando}>
        <div className={`entrada-campo ${erros.protocolo ? 'entrada-campo--invalido' : ''}`.trim()}>
          <label className="entrada-campo__rotulo" htmlFor="consulta-protocolo">
            Protocolo
          </label>
          <input
            ref={protocoloRef}
            id="consulta-protocolo"
            name="protocolo"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={30}
            placeholder="Ex.: LAB-2026-0142"
            aria-invalid={erros.protocolo ? true : undefined}
            aria-describedby={erros.protocolo ? 'consulta-protocolo-erro' : undefined}
            value={protocolo}
            onChange={(evento) => {
              setProtocolo(evento.target.value);
              setErros((atual) => ({ ...atual, protocolo: undefined }));
            }}
            required
          />
          <MensagemErroCampo id="consulta-protocolo-erro" mensagem={erros.protocolo} />
        </div>
        <div className={`entrada-campo ${erros.cpf ? 'entrada-campo--invalido' : ''}`.trim()}>
          <label className="entrada-campo__rotulo" htmlFor="consulta-cpf">
            CPF do titular
          </label>
          <input
            ref={cpfRef}
            id="consulta-cpf"
            name="cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            placeholder="000.000.000-00"
            aria-invalid={erros.cpf ? true : undefined}
            aria-describedby={erros.cpf ? 'consulta-cpf-erro' : undefined}
            value={cpf}
            onChange={(evento) => {
              setCpf(formatarCpf(evento.target.value));
              setErros((atual) => ({ ...atual, cpf: undefined }));
            }}
            required
          />
          <MensagemErroCampo id="consulta-cpf-erro" mensagem={erros.cpf} />
        </div>
        <Button type="submit" disabled={carregando}>
          {carregando ? 'Consultando...' : 'Consultar Laudo'}
          <SetaVelocidade />
        </Button>
        {/* TEMPORARIO: preenche o laudo mockado do backend (laudo_service.py); remover antes de publicar. */}
        {import.meta.env.DEV && (
          <button
            type="button"
            className="entrada-teste"
            onClick={() => {
              setProtocolo('20101.2306');
              setCpf('529.982.247-25');
              setErros({});
            }}
            disabled={carregando}
          >
            Preencher dados de teste
          </button>
        )}
      </form>
    </LayoutEntrada>
  );
}
