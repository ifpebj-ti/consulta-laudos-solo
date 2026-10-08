import type { ReactNode } from 'react';
import { useDecimalField } from '@/hooks/useDecimalField';
import { MensagemErroCampo } from './MensagemErroCampo';
import './FormField.css';

interface FormFieldProps {
  id: string;
  label: ReactNode;
  unit?: ReactNode;
  help?: ReactNode;
  value: number;
  onChange: (numero: number) => void;
  placeholder?: string;
  /** Mensagem de validação exibida abaixo do campo. */
  erro?: string | null;
  required?: boolean;
  className?: string;
}

export function FormField({
  id,
  label,
  unit,
  help,
  value,
  onChange,
  placeholder,
  erro,
  required,
  className = '',
}: FormFieldProps) {
  const campo = useDecimalField(value, onChange);
  const idErro = `${id}-erro`;

  return (
    <div className={`form-field ${erro ? 'form-field--invalido' : ''} ${className}`.trim()}>
      <label htmlFor={id}>
        {label} {unit && <span className="unit">{unit}</span>}
        {required && <span className="form-field__obrigatorio" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        placeholder={placeholder}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        {...campo}
      />
      {help && <span className="form-field--help">{help}</span>}
      <MensagemErroCampo id={idErro} mensagem={erro} />
    </div>
  );
}
