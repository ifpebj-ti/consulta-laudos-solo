import type { BadgeVariant } from '@/components/ui/Badge';
import type { StatusAmostra } from './tipos';

export function rotuloStatus(status: StatusAmostra): string {
  switch (status) {
    case 'nao_iniciado':
      return 'Não iniciado';
    case 'em_andamento':
      return 'Em andamento';
    case 'concluido':
      return 'Concluído';
  }
}

export function variantStatus(status: StatusAmostra): BadgeVariant {
  switch (status) {
    case 'nao_iniciado':
      return 'status-processamento';
    case 'em_andamento':
      return 'medio';
    case 'concluido':
      return 'status-concluido';
  }
}

export const DIAS_PREVISAO_ENTREGA = 15;

function paraIsoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Data de hoje (fuso local) no formato AAAA-MM-DD. */
export function hojeIso(): string {
  return paraIsoLocal(new Date());
}

/** Previsão de entrega do laudo: data de recebimento + 15 dias (AAAA-MM-DD). */
export function calcularPrevisaoEntrega(dataRecebimento: string): string {
  const [ano, mes, dia] = dataRecebimento.split('-').map(Number);
  if (!ano || !mes || !dia) return '';
  return paraIsoLocal(new Date(ano, mes - 1, dia + DIAS_PREVISAO_ENTREGA));
}

export function urgenciaPrazo(prazo: string): { variant: BadgeVariant; rotulo: string } {
  if (!prazo) return { variant: 'status-processamento', rotulo: 'Sem prazo definido' };
  const hoje = hojeIso();
  if (prazo < hoje) return { variant: 'baixo', rotulo: 'Atrasado' };
  if (prazo === hoje) return { variant: 'medio', rotulo: 'Vence hoje' };
  return { variant: 'adequado', rotulo: 'No prazo' };
}

export function formatarData(data: string): string {
  if (!data) return '—';
  const [ano, mes, dia] = data.split('-');
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}
