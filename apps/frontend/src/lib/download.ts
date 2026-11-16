const TEMPO_PARA_REVOGAR_MS = 60_000;

export function salvarArquivo(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), TEMPO_PARA_REVOGAR_MS);
}

export function nomeArquivoSeguro(nome: string, extensao: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const sufixo = `.${extensao}`;
  return base.toLowerCase().endsWith(sufixo) ? base : `${base || 'arquivo'}${sufixo}`;
}
