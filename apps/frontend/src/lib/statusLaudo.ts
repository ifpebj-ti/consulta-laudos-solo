import type { BadgeVariant } from '@/components/ui/Badge';

export type StatusLaudoServidor =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'AGUARDANDO_HOMOLOGACAO'
  | 'CONCLUIDO'
  | 'PENDENCIA'
  | 'RECOLETA'
  | 'CANCELADO';

export type CategoriaStatusLaudo = 'aguardando' | 'andamento' | 'emitido' | 'bloqueado' | 'desconhecido';

export const ETAPAS_LAUDO = ['Recebida', 'Em análise', 'Homologação', 'Emitido'] as const;

export interface InfoStatusLaudo {
  codigo: StatusLaudoServidor | null;
  categoria: CategoriaStatusLaudo;
  rotulo: string;
  variant: BadgeVariant;
  titulo: string;
  descricaoCliente: string;
  etapaAtual: number | null;
  permiteDownload: boolean;
}

type DefinicaoStatus = Omit<InfoStatusLaudo, 'codigo'>;

const STATUS: Record<StatusLaudoServidor, DefinicaoStatus> = {
  PENDENTE: {
    categoria: 'aguardando',
    rotulo: 'Amostra recebida',
    variant: 'status-processamento',
    titulo: 'Análise ainda não iniciada',
    descricaoCliente: 'A amostra foi registrada pelo laboratório e aguarda o início das análises.',
    etapaAtual: 0,
    permiteDownload: false,
  },
  EM_ANALISE: {
    categoria: 'andamento',
    rotulo: 'Em análise',
    variant: 'status-processamento',
    titulo: 'Análise em andamento',
    descricaoCliente: 'A amostra está sendo analisada pelo laboratório.',
    etapaAtual: 1,
    permiteDownload: false,
  },
  AGUARDANDO_HOMOLOGACAO: {
    categoria: 'andamento',
    rotulo: 'Aguardando homologação',
    variant: 'status-homologacao',
    titulo: 'Aguardando homologação',
    descricaoCliente: 'As análises foram concluídas e o laudo aguarda a assinatura do responsável técnico.',
    etapaAtual: 2,
    permiteDownload: false,
  },
  CONCLUIDO: {
    categoria: 'emitido',
    rotulo: 'Concluído',
    variant: 'status-concluido',
    titulo: 'Laudo emitido',
    descricaoCliente: 'O laudo foi homologado e está disponível.',
    etapaAtual: 3,
    permiteDownload: true,
  },
  PENDENCIA: {
    categoria: 'bloqueado',
    rotulo: 'Com pendência',
    variant: 'baixo',
    titulo: 'Laudo com pendência',
    descricaoCliente:
      'Encontramos uma pendência com a amostra ou com os dados enviados. Entre em contato com o Laboratório de Solos para regularizar.',
    etapaAtual: null,
    permiteDownload: false,
  },
  RECOLETA: {
    categoria: 'bloqueado',
    rotulo: 'Nova coleta solicitada',
    variant: 'medio',
    titulo: 'Nova coleta solicitada',
    descricaoCliente:
      'O laboratório precisa de uma nova amostra para concluir a análise. Entre em contato com o Laboratório de Solos para combinar a recoleta.',
    etapaAtual: null,
    permiteDownload: false,
  },
  CANCELADO: {
    categoria: 'bloqueado',
    rotulo: 'Cancelado',
    variant: 'baixo',
    titulo: 'Laudo cancelado',
    descricaoCliente:
      'Este laudo foi cancelado ou a amostra foi recusada pelo laboratório. Entre em contato com o Laboratório de Solos para mais informações.',
    etapaAtual: null,
    permiteDownload: false,
  },
};

const STATUS_DESCONHECIDO: DefinicaoStatus = {
  categoria: 'desconhecido',
  rotulo: 'Situação em atualização',
  variant: 'status-processamento',
  titulo: 'Situação em atualização',
  descricaoCliente: 'A situação deste laudo está sendo atualizada. Consulte novamente mais tarde ou procure o laboratório.',
  etapaAtual: null,
  permiteDownload: false,
};

const SINONIMOS: Record<string, StatusLaudoServidor> = {
  RECEBIDA: 'PENDENTE',
  RECEBIDO: 'PENDENTE',
  NAO_INICIADO: 'PENDENTE',
  EM_ANDAMENTO: 'EM_ANALISE',
  HOMOLOGACAO: 'AGUARDANDO_HOMOLOGACAO',
  EMITIDO: 'CONCLUIDO',
  RECUSADO: 'CANCELADO',
  RECUSADA: 'CANCELADO',
  CANCELADA: 'CANCELADO',
  AMOSTRA_INADEQUADA: 'PENDENCIA',
  DADOS_INCONSISTENTES: 'PENDENCIA',
  RECOLETA_SOLICITADA: 'RECOLETA',
  AMOSTRA_DEVOLVIDA: 'RECOLETA',
};

export function normalizarStatusLaudo(status: string | null | undefined): StatusLaudoServidor | null {
  const normalizado = (status ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!normalizado) return null;
  if (normalizado in STATUS) return normalizado as StatusLaudoServidor;
  return SINONIMOS[normalizado] ?? null;
}

export function infoStatusLaudo(status: string | null | undefined): InfoStatusLaudo {
  const codigo = normalizarStatusLaudo(status);
  return { codigo, ...(codigo ? STATUS[codigo] : STATUS_DESCONHECIDO) };
}

export function laudoConcluido(status: string | null | undefined): boolean {
  return normalizarStatusLaudo(status) === 'CONCLUIDO';
}
