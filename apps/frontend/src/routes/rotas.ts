export const rotaAnalise = (protocolo: string) => `/analista/analises/${encodeURIComponent(protocolo)}`;

export interface EstadoRedirecionamento {
  de?: string;
}

export function destinoAposLogin(estado: unknown, prefixoPermitido: string, padrao: string): string {
  const de = (estado as EstadoRedirecionamento | null)?.de;
  if (typeof de === 'string' && de.startsWith(prefixoPermitido) && !de.startsWith('//')) return de;
  return padrao;
}
