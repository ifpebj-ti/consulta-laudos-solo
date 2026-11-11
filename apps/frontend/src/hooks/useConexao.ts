import { useEffect, useState } from 'react';

export function useConexao(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));

  useEffect(() => {
    const aoConectar = () => setOnline(true);
    const aoDesconectar = () => setOnline(false);
    window.addEventListener('online', aoConectar);
    window.addEventListener('offline', aoDesconectar);
    return () => {
      window.removeEventListener('online', aoConectar);
      window.removeEventListener('offline', aoDesconectar);
    };
  }, []);

  return online;
}
