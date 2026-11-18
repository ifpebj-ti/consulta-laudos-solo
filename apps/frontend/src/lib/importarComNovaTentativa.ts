const ESPERA_ENTRE_TENTATIVAS_MS = 600;

export async function importarComNovaTentativa<T>(importar: () => Promise<T>, tentativas = 2): Promise<T> {
  try {
    return await importar();
  } catch (erro) {
    if (tentativas <= 1) throw erro;
    await new Promise((resolver) => setTimeout(resolver, ESPERA_ENTRE_TENTATIVAS_MS));
    return importarComNovaTentativa(importar, tentativas - 1);
  }
}
