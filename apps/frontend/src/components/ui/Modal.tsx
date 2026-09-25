import { useEffect, type ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, subtitle, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', aoPressionarTecla);
    return () => document.removeEventListener('keydown', aoPressionarTecla);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay is-open"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div className="modal-box" role="dialog" aria-modal="true">
        <div className="modal-box__header">
          <div>
            <h3>{title}</h3>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button type="button" className="modal-box__fechar" aria-label="Fechar" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-box__body">{children}</div>
      </div>
    </div>
  );
}
