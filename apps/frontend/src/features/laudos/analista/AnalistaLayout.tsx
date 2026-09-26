import { Outlet } from 'react-router-dom';
import { AnalistaProvider } from '@/context/AnalistaContext';

export function AnalistaLayout() {
  return (
    <AnalistaProvider>
      <Outlet />
    </AnalistaProvider>
  );
}
