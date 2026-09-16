import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BrandMark } from './BrandMark';
import './Navbar.css';

export function Navbar({ titulo }: { titulo: string }) {
  const { session, sair } = useAuth();
  const navigate = useNavigate();

  function aoSair() {
    sair();
    navigate('/', { replace: true });
  }

  return (
    <header className="navbar">
      <BrandMark />
      <span className="navbar__titulo">{titulo}</span>
      <div className="navbar__conta">
        {session?.nome && <span className="navbar__usuario">{session.nome}</span>}
        <button type="button" className="navbar__sair" onClick={aoSair}>
          Sair
        </button>
      </div>
    </header>
  );
}
