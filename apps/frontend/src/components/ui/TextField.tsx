import type { ReactNode } from 'react';
import { MensagemErroCampo } from './MensagemErroCampo';
import './FormField.css';

interface TextFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'email' | 'tel';
  required?: boolean;
  /** Mensagem de validação própria, exibida no lugar do balão nativo do navegador. */
  erro?: string | null;
  className?: string;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  erro,
  className = '',
}: TextFieldProps) {
  const idErro = `${id}-erro`;
  return (
    <div className={`form-field ${erro ? 'form-field--invalido' : ''} ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {required && <span className="form-field__obrigatorio" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <MensagemErroCampo id={idErro} mensagem={erro} />
    </div>
  );
}
