import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { useAnalista } from '@/context/AnalistaContext';
import { RegistroForm } from './RegistroForm';
import { HomologacaoView } from './HomologacaoView';
import './AnaliseLaudoPage.css';

type Aba = 'registro' | 'homologacao';

export function AnaliseLaudoPage() {
  const { amostraAtual, atualizarAmostraAtual, concluirAmostraAtual } = useAnalista();
  const [aba, setAba] = useState<Aba>('registro');
  const navigate = useNavigate();

  if (!amostraAtual) {
    return <Navigate to="/analista" replace />;
  }

  function irParaAba(proxima: Aba) {
    setAba(proxima);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <Navbar titulo="Módulo do Analista" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <span className="page-header__eyebrow">Laboratório de Solos &middot; Uso interno</span>
            <h1>Gestão de Análises Laboratoriais</h1>
            <p>Registro de dados de bancada, cálculos automáticos e homologação de laudos técnicos.</p>
          </div>
          <Badge variant="status-processamento">Amostra: {amostraAtual.identificacao.protocolo || 'sem protocolo'}</Badge>
        </div>

        <div className="subnav" role="tablist" aria-label="Etapas do processo laboratorial">
          <button type="button" className="subnav__btn" onClick={() => navigate('/analista')}>
            &larr; Voltar para o Painel do Analista
          </button>
          {aba === 'homologacao' && (
            <button type="button" className="subnav__btn" onClick={() => irParaAba('registro')}>
              &larr; Voltar para Registrar Dados
            </button>
          )}
        </div>

        {aba === 'registro' ? (
          <RegistroForm
            dados={amostraAtual}
            onChange={atualizarAmostraAtual}
            onProcessar={() => irParaAba('homologacao')}
          />
        ) : (
          <HomologacaoView
            dados={amostraAtual}
            onVoltarParaEdicao={() => irParaAba('registro')}
            onLiberarLaudo={concluirAmostraAtual}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
