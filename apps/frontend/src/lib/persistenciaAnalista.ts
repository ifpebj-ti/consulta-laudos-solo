const CHAVE_PERSISTENCIA_DEV = 'consulta-laudos-solo:amostras-analista';

export function chavePersistenciaAnalista(usuario: string | undefined): string | null {
  const id = (usuario ?? '').trim().toLowerCase();
  return id ? `${CHAVE_PERSISTENCIA_DEV}:${id}` : null;
}
