import { useEffect, useRef, type ReactNode } from 'react';
import { LinhasVelocidade } from '@/features/home/LayoutEntrada';
import '@/styles/painel-minimalista.css';
import '@/components/ui/Button.css';
import './Feedback.css';

interface EstadoTelaProps {
  codigo: string;
  titulo: string;
  destaque: string;
  descricao: ReactNode;
  acoes: ReactNode;
}

export function EstadoTela({ codigo, titulo, destaque, descricao, acoes }: EstadoTelaProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <div className="painel-min">
      <LinhasVelocidade className="painel-min__velocidade" />
      <main id="conteudo" className="estado-tela" tabIndex={-1}>
        <span className="estado-tela__codigo">{codigo}</span>
        <h1 ref={tituloRef} className="estado-tela__titulo" tabIndex={-1}>
          <span>{titulo}</span>
          <span>{destaque}</span>
        </h1>
        <p className="estado-tela__texto">{descricao}</p>
        <div className="estado-tela__acoes">{acoes}</div>
      </main>
    </div>
  );
}
