import { useEffect, useState } from 'react';

export function useValorAtrasado<T>(valor: T, atrasoMs: number): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const temporizador = window.setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => window.clearTimeout(temporizador);
  }, [valor, atrasoMs]);
  return atrasado;
}
