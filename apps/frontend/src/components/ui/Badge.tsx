import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant =
  | 'baixo'
  | 'medio'
  | 'adequado'
  | 'status-concluido'
  | 'status-homologacao'
  | 'status-processamento';

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
