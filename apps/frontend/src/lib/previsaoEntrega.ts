import { FUSO_LABORATORIO, formatarDataHoraServidor } from './datas';

export type SituacaoPrevisao = 'sem_previsao' | 'atrasada' | 'hoje' | 'amanha' | 'futura';

export interface PrevisaoEntrega {
  situacao: SituacaoPrevisao;
  texto: string;
}

function diaNoFuso(data: Date): string {
  return data.toLocaleDateString('en-CA', { timeZone: FUSO_LABORATORIO });
}

function diasEntre(inicio: string, fim: string): number {
  const [a1, m1, d1] = inicio.split('-').map(Number);
  const [a2, m2, d2] = fim.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

export function descreverPrevisaoEntrega(valor: string | null | undefined, agora: Date = new Date()): PrevisaoEntrega {
  if (!valor) return { situacao: 'sem_previsao', texto: 'Previsão de entrega ainda não informada.' };
  const somenteData = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const data = new Date(somenteData ? `${valor}T12:00:00` : valor);
  if (Number.isNaN(data.getTime())) return { situacao: 'sem_previsao', texto: 'Previsão de entrega ainda não informada.' };

  const diaPrevisto = somenteData ? valor : diaNoFuso(data);
  const diferenca = diasEntre(diaNoFuso(agora), diaPrevisto);
  const dataFormatada = somenteData
    ? diaPrevisto.split('-').reverse().join('/')
    : formatarDataHoraServidor(valor);

  if (diferenca < 0) {
    return {
      situacao: 'atrasada',
      texto: `A previsão de entrega (${dataFormatada}) já passou. Entre em contato com o laboratório para saber a nova data.`,
    };
  }
  if (diferenca === 0) return { situacao: 'hoje', texto: 'Previsão de entrega: hoje.' };
  if (diferenca === 1) return { situacao: 'amanha', texto: 'Previsão de entrega: amanhã.' };
  return { situacao: 'futura', texto: `Previsto para ${dataFormatada}.` };
}
