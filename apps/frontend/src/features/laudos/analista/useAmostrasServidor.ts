import { useEffect, useState } from 'react';
import { analiseService, type ItemListagemAmostra } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { normalizarStatusLaudo } from '@/lib/statusLaudo';
import type { CartaoAmostra, StatusAmostra } from './tipos';

export const TAMANHO_PAGINA_SERVIDOR = 100;

export function statusLocalDoServidor(status: string): StatusAmostra {
  switch (normalizarStatusLaudo(status)) {
    case 'CONCLUIDO':
      return 'concluido';
    case 'PENDENTE':
      return 'nao_iniciado';
    case 'AGUARDANDO_HOMOLOGACAO':
      return 'aguardando_homologacao';
    default:
      return 'em_andamento';
  }
}

export function cartaoDoServidor(item: ItemListagemAmostra): CartaoAmostra {
  return {
    protocolo: item.protocolo,
    solicitante: item.solicitante,
    propriedade: item.propriedade,
    prazo: item.prazo ?? '',
    status: statusLocalDoServidor(item.status),
  };
}

export type EstadoListagem =
  | { tipo: 'desativado' }
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; cartoes: CartaoAmostra[]; total: number }
  | { tipo: 'erro'; mensagem: string };

export function useAmostrasServidor(ativo: boolean, token: string | undefined, recarga: number): EstadoListagem {
  const [estado, setEstado] = useState<EstadoListagem>(ativo ? { tipo: 'carregando' } : { tipo: 'desativado' });

  useEffect(() => {
    if (!ativo || !token) {
      setEstado({ tipo: 'desativado' });
      return;
    }
    const controlador = new AbortController();
    setEstado({ tipo: 'carregando' });
    analiseService
      .listarAmostras({ pagina: 1, tamanhoPagina: TAMANHO_PAGINA_SERVIDOR }, token, controlador.signal)
      .then((res) => setEstado({ tipo: 'pronto', cartoes: res.dados.itens.map(cartaoDoServidor), total: res.dados.total }))
      .catch((erro: unknown) => {
        if (erro instanceof ApiError && erro.foiCancelada) return;
        setEstado({
          tipo: 'erro',
          mensagem: erro instanceof ApiError ? erro.message : 'Não foi possível carregar as amostras.',
        });
      });
    return () => controlador.abort();
  }, [ativo, token, recarga]);

  return estado;
}
