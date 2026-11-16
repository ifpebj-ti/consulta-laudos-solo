import { useEffect, useRef, useState } from 'react';
import { useConexao } from '@/hooks/useConexao';
import './Feedback.css';

const TEMPO_AVISO_RECONEXAO_MS = 4000;

export function AvisoConexao() {
  const online = useConexao();
  const [reconectou, setReconectou] = useState(false);
  const esteveOfflineRef = useRef(!online);

  useEffect(() => {
    if (!online) {
      esteveOfflineRef.current = true;
      setReconectou(false);
      return;
    }
    if (!esteveOfflineRef.current) return;
    esteveOfflineRef.current = false;
    setReconectou(true);
    const temporizador = window.setTimeout(() => setReconectou(false), TEMPO_AVISO_RECONEXAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [online]);

  return (
    <div className="aviso-conexao-regiao" role="status" aria-live="polite">
      {!online && (
        <div className="aviso-conexao aviso-conexao--offline">
          Você está sem conexão com a internet. Algumas ações ficam indisponíveis até a conexão voltar.
        </div>
      )}
      {online && reconectou && <div className="aviso-conexao aviso-conexao--online">Conexão restabelecida.</div>}
    </div>
  );
}
