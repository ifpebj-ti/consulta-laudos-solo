export function respostaJson(corpo: unknown, status = 200, cabecalhos: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...cabecalhos },
  });
}

export function respostaPdf(conteudo = '%PDF-1.4 teste', cabecalhos: Record<string, string> = {}): Response {
  return new Response(new Blob([conteudo], { type: 'application/pdf' }), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', ...cabecalhos },
  });
}

export function tokenComExpiracao(segundosAPartirDeAgora: number): string {
  const codificar = (valor: object) =>
    btoa(JSON.stringify(valor)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + segundosAPartirDeAgora;
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar({ sub: 'teste', exp })}.assinatura`;
}
