import { useDecimalField } from '@/hooks/useDecimalField';

interface DecimalInputProps {
  id?: string;
  className?: string;
  value: number;
  onChange: (numero: number) => void;
}

export function DecimalInput({ id, className, value, onChange }: DecimalInputProps) {
  const campo = useDecimalField(value, onChange);
  return <input id={id} className={className} {...campo} />;
}
