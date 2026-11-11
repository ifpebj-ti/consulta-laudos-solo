export const FUSO_LABORATORIO = 'America/Recife';

export function formatarDataHoraServidor(valor: string | null | undefined, comHora = false): string {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', {
    timeZone: FUSO_LABORATORIO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(comHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
