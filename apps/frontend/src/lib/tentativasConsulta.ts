const CHAVE = 'consulta-laudos-solo:tentativas-consulta';
const FALHAS_SEM_ESPERA = 3;
const ESPERA_INICIAL_S = 5;
const ESPERA_MAXIMA_S = 300;

interface RegistroTentativas {
  falhas: number;
  bloqueadoAte: number;
}

function ler(): RegistroTentativas {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    const valor = bruto ? (JSON.parse(bruto) as Partial<RegistroTentativas>) : null;
    return {
      falhas: typeof valor?.falhas === 'number' && valor.falhas > 0 ? valor.falhas : 0,
      bloqueadoAte: typeof valor?.bloqueadoAte === 'number' ? valor.bloqueadoAte : 0,
    };
  } catch {
    return { falhas: 0, bloqueadoAte: 0 };
  }
}

function gravar(registro: RegistroTentativas | null) {
  try {
    if (registro) sessionStorage.setItem(CHAVE, JSON.stringify(registro));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    return;
  }
}

export function esperaAposFalhas(falhas: number): number {
  if (falhas < FALHAS_SEM_ESPERA) return 0;
  return Math.min(ESPERA_INICIAL_S * 2 ** (falhas - FALHAS_SEM_ESPERA), ESPERA_MAXIMA_S);
}

export function consultaBloqueadaAte(): number {
  return ler().bloqueadoAte;
}

export function registrarFalhaConsulta(agora = Date.now()): number {
  const falhas = ler().falhas + 1;
  const espera = esperaAposFalhas(falhas);
  const bloqueadoAte = espera > 0 ? agora + espera * 1000 : 0;
  gravar({ falhas, bloqueadoAte });
  return bloqueadoAte;
}

export function limparFalhasConsulta(): void {
  gravar(null);
}

export function segundosRestantes(bloqueadoAte: number, agora = Date.now()): number {
  return bloqueadoAte > agora ? Math.ceil((bloqueadoAte - agora) / 1000) : 0;
}
