import { describe, expect, it, vi } from 'vitest';
import { analiseService } from './analiseService';
import { DADOS_ANALISE_VAZIOS } from '@/features/laudos/analista/tipos';
import { respostaJson } from '@/test/utilitarios';

describe('analiseService', () => {
  it('criarAmostra envia POST /laudos com token e payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({
        sucesso: true,
        mensagem: 'Criada',
        dados: { protocolo: 'LAB-1', cliente_nome: 'João', propriedade: 'Sítio', status: 'PENDENTE', versao: 1, criadoEm: '2026-11-01' },
      }),
    );

    const payload = {
      protocolo: 'LAB-1',
      cpf_cliente: '52998224725',
      cliente_nome: 'João',
      propriedade: 'Sítio',
      dataRecebimento: '2026-11-01',
      tipoAnalise: 'fisico_quimica' as const,
      culturaExistente: 'Milho',
    };
    const res = await analiseService.criarAmostra(payload, 'tok-analista');

    expect(res.dados.protocolo).toBe('LAB-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/laudos$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it('listarAmostras aceita apenas token (listagem simples)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ sucesso: true, dados: [] }));

    await analiseService.listarAmostras('tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/laudos$/);
    expect(init?.method).toBe('GET');
  });

  it('listarAmostras com parâmetros envia query string paginada e trim na busca', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({ sucesso: true, dados: { itens: [], total: 0, pagina: 2, tamanhoPagina: 50 } }),
    );

    await analiseService.listarAmostras(
      {
        pagina: 2,
        tamanhoPagina: 50,
        busca: '  boa vista  ',
        situacao: 'pendentes',
        status: 'EM_ANALISE',
        ordenacao: 'prazo',
      },
      'tok',
    );

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toMatch(/\/laudos$/);
    expect(url.searchParams.get('pagina')).toBe('2');
    expect(url.searchParams.get('tamanhoPagina')).toBe('50');
    expect(url.searchParams.get('busca')).toBe('boa vista');
    expect(url.searchParams.get('situacao')).toBe('pendentes');
    expect(url.searchParams.get('status')).toBe('EM_ANALISE');
    expect(url.searchParams.get('ordenacao')).toBe('prazo');
  });

  it('obterAnalise, salvarRascunho, processarAnalise e homologarLaudo codificam protocolo na URL', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respostaJson({ sucesso: true, dados: { protocolo: 'LAB/1 2', status: 'EM_ANALISE', versao: 1 } }))
      .mockResolvedValueOnce(respostaJson({ sucesso: true, mensagem: 'Salvo', dados: { protocolo: 'LAB/1 2', status: 'EM_ANALISE', novaVersao: 2, salvoEm: '2026-11-01' } }))
      .mockResolvedValueOnce(respostaJson({ sucesso: true, mensagem: 'Processado', dados: { protocolo: 'LAB/1 2', status: 'AGUARDANDO_HOMOLOGACAO', novaVersao: 3, calculosOficiais: {}, processadoEm: '2026-11-01' } }))
      .mockResolvedValueOnce(respostaJson({ sucesso: true, mensagem: 'Homologado', dados: { protocolo: 'LAB/1 2', status: 'CONCLUIDO', novaVersao: 4, homologadoEm: '2026-11-01', homologadoPor: 'Carla', temPdfDisponivel: true } }));

    await analiseService.obterAnalise('LAB/1 2', 'tok');
    await analiseService.salvarRascunho('LAB/1 2', { versaoEsperada: 1, quimica: { ph: 6 } }, 'tok');
    await analiseService.processarAnalise(
      'LAB/1 2',
      {
        versaoEsperada: 2,
        quimica: DADOS_ANALISE_VAZIOS.quimica,
        granulometria: DADOS_ANALISE_VAZIOS.granulometria,
        calibracao: { a: 0.03, b: 0.01, r2: 0.99, pontos: [{ x: 0, y: 0 }, { x: 10, y: 0.3 }] },
      },
      'tok',
    );
    await analiseService.homologarLaudo('LAB/1 2', { versaoEsperada: 3 }, 'tok');

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/laudos\/LAB%2F1%202\/analise$/);

    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/laudos\/LAB%2F1%202\/analise\/rascunho$/);
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PATCH');

    expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/laudos\/LAB%2F1%202\/analise\/processar$/);
    expect(fetchMock.mock.calls[2][1]?.method).toBe('POST');

    expect(String(fetchMock.mock.calls[3][0])).toMatch(/\/laudos\/LAB%2F1%202\/homologar$/);
    expect(fetchMock.mock.calls[3][1]?.method).toBe('POST');
  });
});
