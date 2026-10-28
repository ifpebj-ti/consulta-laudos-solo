import './FormField.css';

/** Mensagem de validação abaixo de um campo (substitui o "Preencha este campo" nativo). */
export function MensagemErroCampo({ id, mensagem }: { id: string; mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <span id={id} className="form-field__erro" role="alert">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.5v4.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.3" r="1" fill="#fff" />
      </svg>
      {mensagem}
    </span>
  );
}
