import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import { LayoutEntrada, SetaVelocidade } from '@/features/home/LayoutEntrada';

export function ConsultaLaudoPage() {
  const { entrarComProtocolo } = useAuth();
  const navigate = useNavigate();
  const [protocolo, setProtocolo] = useState('');
  const [cpf, setCpf] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [erros, setErros] = useState<{ protocolo?: string; cpf?: string }>({});

  async function aoConsultar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados: { protocolo?: string; cpf?: string } = {};
    if (!protocolo.trim()) encontrados.protocolo = 'Informe o número do protocolo.';
    if (!cpf.trim()) encontrados.cpf = 'Informe o CPF do titular.';
    setErros(encontrados);
    if (encontrados.protocolo || encontrados.cpf) return;
    setCarregando(true);
    setMensagemErro(null);
    try {
      await entrarComProtocolo(protocolo, cpf);
      navigate('/cliente/laudo', { replace: true });
    } catch (erro) {
      setMensagemErro(erro instanceof ApiError ? erro.message : 'Não foi possível consultar o laudo agora.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <LayoutEntrada tituloId="consulta-titulo" voltar>
      <span className="entrada-etapa">01 · Sou cliente</span>
      <h1 id="consulta-titulo" className="home-titulo entrada-titulo">
        <span>Consultar</span>
        <span className="home-titulo__destaque">Laudo</span>
      </h1>
      <p className="entrada-texto">Informe o Protocolo da amostra e o CPF do titular para acompanhar o andamento.</p>

      {mensagemErro && (
        <div className="entrada-alerta" role="alert">
          {mensagemErro}
        </div>
      )}

      <form className="entrada-form" onSubmit={aoConsultar} noValidate>
        <div className={`entrada-campo ${erros.protocolo ? 'entrada-campo--invalido' : ''}`.trim()}>
          <span className="entrada-campo__rotulo" aria-hidden="true">
            Protocolo
          </span>
          <input
            type="text"
            placeholder="Protocolo (ex.: LAB-2026-0142)"
            aria-label="Número do protocolo"
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
          <span className="entrada-campo__rotulo" aria-hidden="true">
            CPF do titular
          </span>
          <input
            type="text"
            placeholder="CPF"
            aria-label="CPF do titular"
            aria-invalid={erros.cpf ? true : undefined}
            aria-describedby={erros.cpf ? 'consulta-cpf-erro' : undefined}
            value={cpf}
            onChange={(evento) => {
              setCpf(evento.target.value);
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