import { describe, expect, it } from 'vitest';
import { descreverPrevisaoEntrega } from './previsaoEntrega';

const AGORA = new Date('2026-11-10T15:00:00-03:00');

describe('descreverPrevisaoEntrega', () => {
  it('sem data ou com data inválida não inventa prazo', () => {
    expect(descreverPrevisaoEntrega(null, AGORA)).toEqual({
      situacao: 'sem_previsao',
      texto: 'Previsão de entrega ainda não informada.',
    });
    expect(descreverPrevisaoEntrega('nao-e-data', AGORA).situacao).toBe('sem_previsao');
  });

  it('usa texto natural para hoje e amanhã', () => {
    expect(descreverPrevisaoEntrega('2026-11-10', AGORA)).toMatchObject({ situacao: 'hoje', texto: 'Previsão de entrega: hoje.' });
    expect(descreverPrevisaoEntrega('2026-11-11', AGORA)).toMatchObject({ situacao: 'amanha' });
  });

  it('mostra a data futura no formato dd/mm/aaaa', () => {
    expect(descreverPrevisaoEntrega('2026-11-25', AGORA)).toEqual({ situacao: 'futura', texto: 'Previsto para 25/11/2026.' });
  });

  it('avisa atraso em vez de mostrar uma data no passado como previsão', () => {
    const previsao = descreverPrevisaoEntrega('2026-11-01', AGORA);
    expect(previsao.situacao).toBe('atrasada');
    expect(previsao.texto).toMatch(/já passou/);
    expect(previsao.texto).toMatch(/entre em contato/i);
  });

  it('aceita data com hora e considera o fuso do laboratório', () => {
    expect(descreverPrevisaoEntrega('2026-11-11T01:00:00Z', AGORA).situacao).toBe('hoje');
  });
});
