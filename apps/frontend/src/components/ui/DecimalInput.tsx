import type { AriaAttributes } from 'react';
import { useDecimalField } from '@/hooks/useDecimalField';

interface DecimalInputProps extends Pick<AriaAttributes, 'aria-label' | 'aria-invalid' | 'aria-describedby'> {
  id?: string;
  className?: string;
  value: number;
  onChange: (numero: number) => void;
}

export function DecimalInput({ id, className, value, onChange, ...aria }: DecimalInputProps) {
  const campo = useDecimalField(value, onChange);
  return <input id={id} className={className} {...aria} {...campo} />;
}
