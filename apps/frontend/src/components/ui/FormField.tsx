import type { ReactNode } from 'react';
import { useDecimalField } from '@/hooks/useDecimalField';
import './FormField.css';

interface FormFieldProps {
  id: string;
  label: ReactNode;
  unit?: ReactNode;
  help?: ReactNode;
  value: number;
  onChange: (numero: number) => void;
  placeholder?: string;
  className?: string;
}

export function FormField({ id, label, unit, help, value, onChange, placeholder, className = '' }: FormFieldProps) {
  const campo = useDecimalField(value, onChange);

  return (
    <div className={`form-field ${className}`.trim()}>
      <label htmlFor={id}>
        {label} {unit && <span className="unit">{unit}</span>}
      </label>
      <input id={id} placeholder={placeholder} {...campo} />
      {help && <span className="form-field--help">{help}</span>}
    </div>
  );
}
