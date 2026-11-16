import { useCallback, useEffect, useRef, useState } from 'react';
import { FUNCIONALIDADES, INTERVALO_ATUALIZACAO_SITUACAO_MS } from '@/config/ambiente';
import { ApiError } from '@/services/apiClient';
import { laudoService } from '@/services/laudoService';
import type { LaudoDetalhe } from '@/types/laudo';

export type EstadoAtualizacao = { tipo: 'ocioso' } | { tipo: 'atualizando' } | { tipo: 'erro'; mensagem: string };

interface Opcoes {
  protocolo: string;
  token: string;
  emAndamento: boolean;
  onAtualizado: (laudo: LaudoDetalhe) => void;
}

export function useSituacaoLaudo({ protocolo, token, emAndamento, onAtualizado }: Opcoes) {
  const habilitado = FUNCIONALIDADES.situacaoClienteServidor;
  const [estado, setEstado] = useState<EstadoAtualizacao>({ tipo: 'ocioso' });
  const controladorRef = useRef<AbortController | null>(null);
  const onAtualizadoRef = useRef(onAtualizado);
  onAtualizadoRef.current = onAtualizado;

  const atualizar = useCallback(
    async (silencioso = false) => {
      if (!habilitado) return;
      controladorRef.current?.abort();
      const controlador = new AbortController();
      controladorRef.current = controlador;
      if (!silencioso) setEstado({ tipo: 'atualizando' });
      try {
        const resposta = await laudoService.consultarSituacao(protocolo, token, controlador.signal);
        onAtualizadoRef.current(resposta.laudo);
        setEstado({ tipo: 'ocioso' });
      } catch (erro) {
        if (erro instanceof ApiError && erro.foiCancelada) return;
        if (!silencioso) {
          setEstado({
            tipo: 'erro',
            mensagem: erro instanceof ApiError ? erro.message : 'Não foi possível atualizar a situação agora.',
          });
        }
      }
    },
    [habilitado, protocolo, token],
  );

  useEffect(() => {
    if (!habilitado || !emAndamento) return;
    const temporizador = window.setInterval(() => {
      if (document.visibilityState === 'visible') void atualizar(true);
    }, INTERVALO_ATUALIZACAO_SITUACAO_MS);
    const aoVoltarParaAba = () => {
      if (document.visibilityState === 'visible') void atualizar(true);
    };
    document.addEventListener('visibilitychange', aoVoltarParaAba);
    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', aoVoltarParaAba);
    };
  }, [habilitado, emAndamento, atualizar]);

  useEffect(() => () => controladorRef.current?.abort(), []);

  return { habilitado, estado, atualizar: () => void atualizar(false) };
}
