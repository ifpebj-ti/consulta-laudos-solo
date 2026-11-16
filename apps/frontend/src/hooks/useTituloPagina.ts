import { useEffect } from 'react';

export const SUFIXO_TITULO = 'Laudos de Análise de Solo | IFPE Campus Belo Jardim';

export function montarTitulo(titulo?: string): string {
  return titulo ? `${titulo} · ${SUFIXO_TITULO}` : SUFIXO_TITULO;
}

export function useTituloPagina(titulo?: string): void {
  useEffect(() => {
    document.title = montarTitulo(titulo);
  }, [titulo]);
}
