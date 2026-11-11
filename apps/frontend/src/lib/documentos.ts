export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(cpf[i]) * (tamanho + 1 - i);
    return ((soma * 10) % 11) % 10;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function formatarCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function validarCpf(valor: string): string | null {
  const digitos = somenteDigitos(valor);
  if (!digitos) return 'Informe o CPF do titular.';
  if (digitos.length !== 11) return 'O CPF precisa ter 11 dígitos.';
  if (!cpfValido(digitos)) return 'CPF inválido. Confira os números digitados.';
  return null;
}

export const PROTOCOLO_CONSULTA_REGEX = /^[A-Z0-9.-]{8,30}$/;

export const PROTOCOLO_CADASTRO_REGEX = /^[A-Za-z0-9._/-]{3,32}$/;

export function normalizarProtocolo(valor: string): string {
  return valor.trim().toUpperCase();
}

export function validarProtocoloConsulta(valor: string): string | null {
  const protocolo = normalizarProtocolo(valor);
  if (!protocolo) return 'Informe o número do protocolo.';
  if (protocolo.length < 8 || protocolo.length > 30) return 'O protocolo deve ter entre 8 e 30 caracteres.';
  if (!PROTOCOLO_CONSULTA_REGEX.test(protocolo)) return 'Use apenas letras, números, pontos e traços no protocolo.';
  return null;
}

export function validarProtocoloCadastro(valor: string): string | null {
  const protocolo = valor.trim();
  if (!protocolo) return 'Preencha este campo para continuar.';
  if (!PROTOCOLO_CADASTRO_REGEX.test(protocolo)) {
    return 'Use de 3 a 32 caracteres: letras, números, ponto, traço, barra ou sublinhado.';
  }
  return null;
}

export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
