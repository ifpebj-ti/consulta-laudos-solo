import { Link } from 'react-router-dom';
import { SetaVelocidade } from './LayoutEntrada';
import { doisDigitos } from '@/lib/formatos';

const ACESSOS = [
  { rota: '/cliente', titulo: 'Sou cliente', texto: 'Consulte seu laudo com o protocolo da amostra e o CPF do titular.' },
  { rota: '/analista/login', titulo: 'Sou analista', texto: 'Registre e homologue laudos com sua conta Google institucional.' },
];

export function HomeHero() {
  return (
    <>
      <h1 id="home-titulo" className="home-titulo">
        <span>Sistema de Laudos</span>
        <span className="home-titulo__destaque">Análise de Solo</span>
      </h1>

      <nav className="home-acessos" aria-label="Escolha o tipo de acesso">
        {ACESSOS.map((a, i) => (
          <Link key={a.rota} to={a.rota} className="home-acesso">
            <span className="home-acesso__numero">{doisDigitos(i + 1)}</span>
            <span className="home-acesso__texto">
              <strong>{a.titulo}</strong>
              <span>{a.texto}</span>
            </span>
            <span className="home-acesso__seta">
              <SetaVelocidade />
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
