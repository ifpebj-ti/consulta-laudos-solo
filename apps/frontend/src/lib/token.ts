export function expiracaoDoToken(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(preenchido)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenExpirado(token: string, agora = Date.now()): boolean {
  const expiracao = expiracaoDoToken(token);
  return expiracao !== null && expiracao <= agora;
}
