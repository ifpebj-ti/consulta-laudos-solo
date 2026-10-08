import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import './ConsultaLaudoPage.css';

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
    <>
      <TopBar />
      <main className="consulta-shell">
        <div className="consulta-box">
          <h1>Consultar Laudo</h1>
          <p>Informe o Protocolo da amostra e o CPF do titular para acompanhar o andamento.</p>

          {mensagemErro && (
            <div className="consulta-alerta" role="alert">
              {mensagemErro}
            </div>
          )}

          <form className="consulta-form" onSubmit={aoConsultar} noValidate>
            <div className={`consulta-campo ${erros.protocolo ? 'consulta-campo--invalido' : ''}`.trim()}>
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
            <div className={`consulta-campo ${erros.cpf ? 'consulta-campo--invalido' : ''}`.trim()}>
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
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
