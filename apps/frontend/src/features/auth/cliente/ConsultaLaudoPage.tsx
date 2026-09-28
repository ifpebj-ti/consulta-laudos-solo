import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
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

  async function aoConsultar(evento: FormEvent) {
    evento.preventDefault();
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

          <form className="consulta-form" onSubmit={aoConsultar}>
            <input
              type="text"
              placeholder="Protocolo (ex.: LAB-2026-0142)"
              aria-label="Número do protocolo"
              value={protocolo}
              onChange={(evento) => setProtocolo(evento.target.value)}
              required
            />
            <input
              type="text"
              placeholder="CPF"
              aria-label="CPF do titular"
              value={cpf}
              onChange={(evento) => setCpf(evento.target.value)}
              required
            />
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
