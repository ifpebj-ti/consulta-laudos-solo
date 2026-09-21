import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { RegistroForm } from './RegistroForm';
import { HomologacaoView } from './HomologacaoView';
import { DADOS_ANALISE_INICIAIS, type DadosAnalise } from './tipos';
import './AnaliseLaudoPage.css';

type Aba = 'registro' | 'homologacao';

export function AnaliseLaudoPage() {
  const [aba, setAba] = useState<Aba>('registro');
  const [dados, setDados] = useState<DadosAnalise>(DADOS_ANALISE_INICIAIS);

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
          <Badge variant="status-processamento">Amostra selecionada: LAB-2026-0142</Badge>
        </div>

        <div className="subnav" role="tablist" aria-label="Etapas do processo laboratorial">
          <button
            type="button"
            className={`subnav__btn ${aba === 'registro' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={aba === 'registro'}
            onClick={() => irParaAba('registro')}
          >
            Registrar Dados da Análise
          </button>
          <button
            type="button"
            className={`subnav__btn ${aba === 'homologacao' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={aba === 'homologacao'}
            onClick={() => irParaAba('homologacao')}
          >
            Homologar Laudo
          </button>
        </div>

        {aba === 'registro' ? (
          <RegistroForm dados={dados} onChange={setDados} onProcessar={() => irParaAba('homologacao')} />
        ) : (
          <HomologacaoView dados={dados} onVoltarParaEdicao={() => irParaAba('registro')} />
        )}
      </main>
      <Footer />
    </>
  );
}
