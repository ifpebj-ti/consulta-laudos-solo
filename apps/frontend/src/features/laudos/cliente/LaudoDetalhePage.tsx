import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { laudoService } from '@/services/laudoService';
import { ApiError } from '@/services/apiClient';
import { statusParaBadge } from './statusBadge';
import './LaudoDetalhePage.css';

export function LaudoDetalhePage() {
  const { session, sair } = useAuth();
  const navigate = useNavigate();
  const [baixando, setBaixando] = useState(false);
  const [erroDownload, setErroDownload] = useState<string | null>(null);

  if (!session?.laudo) {
    return <Navigate to="/cliente" replace />;
  }

  const { laudo } = session;
  const { variant, rotulo } = statusParaBadge(laudo.status);
  const dataEmissao = new Date(laudo.dataEmissao).toLocaleDateString('pt-BR');

  const indicadores: Array<{ nome: string; valor: string }> = [
    ...(laudo.parametrosSolo.ph != null ? [{ nome: 'pH', valor: laudo.parametrosSolo.ph.toFixed(2) }] : []),
    ...(laudo.parametrosSolo.fosforo ? [{ nome: 'Fósforo (P)', valor: laudo.parametrosSolo.fosforo }] : []),
    ...(laudo.parametrosSolo.potassio ? [{ nome: 'Potássio (K)', valor: laudo.parametrosSolo.potassio }] : []),
    ...(laudo.parametrosSolo.materiaOrganica
      ? [{ nome: 'Matéria Orgânica', valor: laudo.parametrosSolo.materiaOrganica }]
      : []),
  ];

  async function aoBaixarPdf() {
    if (!session) return;
    setBaixando(true);
    setErroDownload(null);
    try {
      await laudoService.baixarPdf(laudo.protocolo, session.token);
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 401) {
        sair();
        navigate('/cliente', { replace: true });
        return;
      }
      setErroDownload(erro instanceof ApiError ? erro.message : 'Não foi possível baixar o PDF agora.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <Navbar titulo="Portal do Cliente" />
      <main className="page-container cliente-shell">
        <div className="detalhe-cabecalho">
          <div className="detalhe-cabecalho__topo">
            <div>
              <h2>Laudo Técnico — {laudo.protocolo}</h2>
              <p className="detalhe-cabecalho__sub">
                {laudo.cliente.nome} &middot; {laudo.propriedade} &middot; Emitido em {dataEmissao}
              </p>
            </div>
            <Badge variant={variant}>{rotulo}</Badge>
          </div>

          {indicadores.length > 0 && (
            <>
              <p className="section-heading" style={{ marginTop: 0 }}>
                Indicadores de fertilidade
              </p>
              <div className="indicadores-grid">
                {indicadores.map((indicador) => (
                  <div className="indicador-item" key={indicador.nome}>
                    <span className="indicador-nome">{indicador.nome}</span>
                    <span className="indicador-valor">{indicador.valor}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="download-bar">
          <div>
            <strong>Laudo técnico completo (PDF)</strong>
            <p>Titular: {laudo.cliente.nome} ({laudo.cliente.cpfMascarado})</p>
          </div>
          {laudo.temPdfDisponivel ? (
            <Button variant="download" lg onClick={aoBaixarPdf} disabled={baixando}>
              {baixando ? 'Baixando...' : 'Download em PDF'}
            </Button>
          ) : (
            <Button variant="ghost" lg disabled>
              PDF ainda não disponível
            </Button>
          )}
        </div>
        {erroDownload && <div className="alerta-erro">{erroDownload}</div>}
      </main>
      <Footer />
    </>
  );
}
