import { useEffect, useState, type ChangeEvent } from 'react';

function normalizarParaNumero(bruto: string): number | null {
  const normalizado = bruto.trim().replace(',', '.');
  if (normalizado === '' || normalizado === '-') return null;
  const numero = Number(normalizado);
  return Number.isNaN(numero) ? null : numero;
}

/**
 * Campo numérico decimal que aceita "," ou "." e não força o valor para 0
 * enquanto o usuário ainda está digitando (ex.: "6", depois "6.", depois "6.4").
 * Um <input type="number"> controlado por número teria seu texto sobrescrito
 * a cada tecla nesses estados intermediários, atrapalhando a digitação em bancada (RNF04).
 */
export function useDecimalField(valor: number, onChange: (numero: number) => void) {
  const [texto, setTexto] = useState(() => String(valor));

  useEffect(() => {
    if (normalizarParaNumero(texto) !== valor) {
      setTexto(String(valor));
    }
    // Só resincroniza quando o valor externo muda (ex.: "Limpar Formulário").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  function aoMudar(evento: ChangeEvent<HTMLInputElement>) {
    const bruto = evento.target.value;
    setTexto(bruto);
    const numero = normalizarParaNumero(bruto);
    if (numero !== null) onChange(numero);
  }

  return {
    value: texto,
    onChange: aoMudar,
    type: 'text' as const,
    inputMode: 'decimal' as const,
  };
}
