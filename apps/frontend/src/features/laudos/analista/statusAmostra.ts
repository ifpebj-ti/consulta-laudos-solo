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

export function urgenciaPrazo(prazo: string): { variant: BadgeVariant; rotulo: string } {
  if (!prazo) return { variant: 'status-processamento', rotulo: 'Sem prazo definido' };
  const hoje = new Date().toISOString().slice(0, 10);
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
