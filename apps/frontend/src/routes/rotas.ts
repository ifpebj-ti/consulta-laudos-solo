export const rotaAnalise = (protocolo: string) => `/analista/analises/${encodeURIComponent(protocolo)}`;

export interface EstadoRedirecionamento {
  de?: string;
}

const ORIGEM_INTERNA = 'http://interno.invalid';

export function destinoAposLogin(estado: unknown, prefixoPermitido: string, padrao: string): string {
  const de = (estado as EstadoRedirecionamento | null)?.de;
  if (typeof de !== 'string' || !de.startsWith('/') || /[\\\s]|%2f|%5c|%00/i.test(de) || de.startsWith('//')) return padrao;
  let destino: URL;
  try {
    destino = new URL(de, ORIGEM_INTERNA);
  } catch {
    return padrao;
  }
  if (destino.origin !== ORIGEM_INTERNA) return padrao;
  const caminho = `${destino.pathname}${destino.search}`;
  return caminho === prefixoPermitido || caminho.startsWith(`${prefixoPermitido}/`) ? caminho : padrao;
}
