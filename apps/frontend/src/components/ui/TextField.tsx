import type { ReactNode } from 'react';
import './FormField.css';

interface TextFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: 'text' | 'date';
  required?: boolean;
  className?: string;
}

export function TextField({ id, label, value, onChange, placeholder, type = 'text', required, className = '' }: TextFieldProps) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
