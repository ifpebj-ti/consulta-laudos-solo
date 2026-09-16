import type { BadgeVariant } from '@/components/ui/Badge';

export function statusParaBadge(status: string): { variant: BadgeVariant; rotulo: string } {
  const normalizado = status.trim().toUpperCase();

  if (normalizado.includes('CONCLU')) {
    return { variant: 'status-concluido', rotulo: 'Concluído' };
  }
  if (normalizado.includes('HOMOLOG')) {
    return { variant: 'status-homologacao', rotulo: 'Aguardando Homologação' };
  }
  return { variant: 'status-processamento', rotulo: status };
}
