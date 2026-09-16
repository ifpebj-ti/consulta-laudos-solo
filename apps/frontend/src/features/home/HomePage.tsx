import { Link } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Footer } from '@/components/layout/Footer';
import './HomePage.css';

export function HomePage() {
  return (
    <>
      <TopBar />
      <main className="home-shell">
        <div className="home-intro">
          <h1>Sistema de Gestão e Emissão de Laudos de Análise de Solo</h1>
          <p>Instituto Federal de Pernambuco &middot; Campus Belo Jardim &middot; Laboratório de Solos</p>
        </div>
        <div className="home-opcoes">
          <Link to="/cliente" className="home-opcao">
            <span className="home-opcao__badge">Portal do Cliente</span>
            <h2>Consultar meu laudo</h2>
            <p>Acesse com o protocolo da amostra e o CPF do titular.</p>
          </Link>
          <Link to="/analista/login" className="home-opcao">
            <span className="home-opcao__badge">Acesso do Professor</span>
            <h2>Módulo do Analista</h2>
            <p>Entre com sua conta Google institucional para registrar e homologar laudos.</p>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
