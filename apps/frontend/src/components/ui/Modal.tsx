import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}

const SELETOR_FOCAVEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
    (elemento) => !elemento.hasAttribute('inert') && elemento.getAttribute('aria-hidden') !== 'true',
  );
}

export function Modal({ isOpen, onClose, title, subtitle, children }: ModalProps) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const idTitulo = useId();
  const idSubtitulo = useId();

  useEffect(() => {
    if (!isOpen) return;
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const caixa = caixaRef.current;
    if (caixa) {
      const primeiro = elementosFocaveis(caixa).find((el) => !el.classList.contains('modal-box__fechar'));
      (primeiro ?? caixa).focus();
    }

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !caixaRef.current) return;
      const focaveis = elementosFocaveis(caixaRef.current);
      if (focaveis.length === 0) {
        evento.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoPressionarTecla);
    return () => {
      document.removeEventListener('keydown', aoPressionarTecla);
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- clique no fundo é atalho de mouse; teclado fecha com Escape
    <div
      className="modal-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div
        ref={caixaRef}
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={subtitle ? idSubtitulo : undefined}
        tabIndex={-1}
      >
        <div className="modal-box__header">
          <div>
            <h2 id={idTitulo}>{title}</h2>
            {subtitle && <span id={idSubtitulo}>{subtitle}</span>}
          </div>
          <button type="button" className="modal-box__fechar" aria-label="Fechar" onClick={onClose}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-box__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
