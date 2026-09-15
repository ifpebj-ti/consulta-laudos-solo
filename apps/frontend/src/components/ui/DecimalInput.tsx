import { useDecimalField } from '@/hooks/useDecimalField';

interface DecimalInputProps {
  id?: string;
  className?: string;
  value: number;
  onChange: (numero: number) => void;
}

/** Input numérico "solto" (sem label do FormField) que usa o mesmo buffer decimal — ver useDecimalField. */
export function DecimalInput({ id, className, value, onChange }: DecimalInputProps) {
  const campo = useDecimalField(value, onChange);
  return <input id={id} className={className} {...campo} />;
}
