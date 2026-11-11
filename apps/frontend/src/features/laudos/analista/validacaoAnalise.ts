import { calcularAcidezPotencial, calcularGranulometria, calcularValorLiquido, fatorNaohValido } from './calculos';
import type { DadosAnalise } from './tipos';

export interface AvisoAnalise {
  id: string;
  mensagem: string;
  bloqueante: boolean;
}

export const PH_MINIMO = 0;
export const PH_MAXIMO = 14;

const numeroValido = (valor: number) => Number.isFinite(valor);

export function avaliarDadosAnalise(dados: DadosAnalise): AvisoAnalise[] {
  const avisos: AvisoAnalise[] = [];
  const { quimica, granulometria } = dados;

  if (!numeroValido(quimica.ph) || quimica.ph < PH_MINIMO || quimica.ph > PH_MAXIMO) {
    avisos.push({ id: 'ph', mensagem: `O pH deve estar entre ${PH_MINIMO} e ${PH_MAXIMO}.`, bloqueante: true });
  }

  const negativos: Array<[string, number]> = [
    ['Sódio (Na⁺)', quimica.sodioMgL],
    ['Potássio (K⁺)', quimica.potassioMgL],
  ];
  negativos
    .filter(([, valor]) => valor < 0)
    .forEach(([nome]) =>
      avisos.push({ id: `negativo-${nome}`, mensagem: `A leitura de ${nome} não pode ser negativa.`, bloqueante: true }),
    );

  const liquidos: Array<[string, number]> = [
    ['Cálcio (Ca²⁺)', calcularValorLiquido(quimica.calcio.medido, quimica.calcio.branco)],
    ['Magnésio (Mg²⁺)', calcularValorLiquido(quimica.magnesio.medido, quimica.magnesio.branco)],
    ['Alumínio (Al³⁺)', calcularValorLiquido(quimica.aluminio.medido, quimica.aluminio.branco)],
    [
      'Acidez potencial (H⁺+Al³⁺)',
      calcularAcidezPotencial(quimica.acidezPotencial.medido, quimica.acidezPotencial.branco, quimica.acidezPotencial.fator),
    ],
  ];
  liquidos
    .filter(([, valor]) => valor < 0)
    .forEach(([nome]) =>
      avisos.push({
        id: `liquido-${nome}`,
        mensagem: `${nome}: o branco é maior que a leitura e o resultado ficou negativo. Confira os valores.`,
        bloqueante: false,
      }),
    );

  const resultado = calcularGranulometria(granulometria);
  if (resultado.pctAreia !== null && resultado.pctArgila !== null && resultado.pctAreia + resultado.pctArgila > 100) {
    avisos.push({
      id: 'granulometria-soma',
      mensagem: 'Areia e argila somam mais de 100% da amostra (silte negativo). Confira as pesagens e o TFSA.',
      bloqueante: false,
    });
  }
  if (resultado.pctAreia !== null && (resultado.pctAreia < 0 || (resultado.pctArgila ?? 0) < 0)) {
    avisos.push({
      id: 'granulometria-negativa',
      mensagem: 'Há fração com peso negativo (becker cheio menor que o vazio). Confira as pesagens.',
      bloqueante: false,
    });
  }

  return avisos;
}

export interface PendenciasAnalise {
  bloqueantes: string[];
  semValor: string[];
}

export function pendenciasParaProcessar(dados: DadosAnalise): PendenciasAnalise {
  const { quimica, granulometria, calibracao } = dados;
  const bloqueantes: string[] = [];
  if (!calibracao || !calibracao.a) bloqueantes.push('curva de calibração do fósforo');
  if (!(granulometria.tfsa > 0)) bloqueantes.push('peso da amostra (TFSA)');
  if (!fatorNaohValido(quimica.acidezPotencial.fator)) bloqueantes.push('fator de correção do NaOH');
  avaliarDadosAnalise(dados)
    .filter((aviso) => aviso.bloqueante)
    .forEach((aviso) => bloqueantes.push(aviso.mensagem.replace(/\.$/, '').toLowerCase()));

  const camposSemValor: Array<[string, number]> = [
    ['pH', quimica.ph],
    ['leitura de fósforo', quimica.fosforoAbsBruta],
    ['Na', quimica.sodioMgL],
    ['K', quimica.potassioMgL],
    ['Ca', quimica.calcio.medido],
    ['Mg', quimica.magnesio.medido],
    ['H+Al', quimica.acidezPotencial.medido],
    ['pesagem da areia', granulometria.areiaBecker],
    ['pesagem da argila', granulometria.argilaBecker],
    ['pesagem do NaOH', granulometria.naohBecker],
  ];
  const semValor = camposSemValor.filter(([, valor]) => !valor).map(([nome]) => nome);

  return { bloqueantes, semValor };
}
