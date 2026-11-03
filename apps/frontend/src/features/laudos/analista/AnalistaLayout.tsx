import { Outlet } from 'react-router-dom';
import { AnalistaProvider } from '@/context/AnalistaContext';
import '@/styles/painel-minimalista.css';

export function AnalistaLayout() {
  return (
    <AnalistaProvider>
      <div className="painel-min">
        <Outlet />
      </div>
    </AnalistaProvider>
  );
}
