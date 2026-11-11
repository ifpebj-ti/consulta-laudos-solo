import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiClient';
import { classificarFalhaPdf, laudoService, nomePadraoPdf } from './laudoService';
import { respostaJson, respostaPdf } from '@/test/utilitarios';

describe('classificarFalhaPdf', () => {
  it.each([
    [new ApiError(404, 'x'), 'indisponivel', true],
    [new ApiError(409, 'x'), 'indisponivel', true],
    [new ApiError(401, 'x'), 'sessao_expirada', false],
    [new ApiError(403, 'x'), 'sem_permissao', false],
    [new ApiError(429, 'x'), 'limite_requisicoes', true],
    [new ApiError(503, 'x'), 'servidor', true],
    [new ApiError(0, 'x', 'NETWORK_ERROR'), 'rede', true],
    [new ApiError(0, 'x', 'TIMEOUT'), 'rede', true],
    [new ApiError(200, 'x', 'INVALID_RESPONSE'), 'formato_invalido', true],
    [new ApiError(0, 'x', 'ABORTED'), 'cancelado', false],
    [new Error('qualquer'), 'desconhecido', true],
  ])('classifica %s', (erro, motivo, podeTentar) => {
    const falha = classificarFalhaPdf(erro);
    expect(falha.motivo).toBe(motivo);
    expect(falha.podeTentarNovamente).toBe(podeTentar);
    expect(falha.mensagem).not.toMatch(/Traceback|Exception/);
  });
});

describe('laudoService.baixarPdf', () => {
  it('baixa com o nome enviado pelo servidor e libera a URL temporária', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaPdf('%PDF', { 'Content-Disposition': 'attachment; filename="laudo-20101.2306.pdf"' }),
    );
    const criar = vi.fn(() => 'blob:teste');
    const revogar = vi.fn();
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: revogar });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const nome = await laudoService.baixarPdf('20101.2306', 'token');

    expect(nome).toBe('laudo-20101.2306.pdf');
    expect(clique).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revogar).toHaveBeenCalledWith('blob:teste');
    vi.useRealTimers();
  });

  it('usa nome padrão quando o servidor não informa o arquivo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaPdf());
    Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await expect(laudoService.baixarPdf('LAB/2026 01', 'token')).resolves.toBe(nomePadraoPdf('LAB/2026 01'));
    expect(nomePadraoPdf('LAB/2026 01')).toBe('laudo-LAB-2026-01.pdf');
  });

  it('propaga 404 como erro para a tela tratar', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson({ detail: { mensagem: 'Arquivo PDF do laudo não encontrado.' } }, 404),
    );
    await expect(laudoService.baixarPdf('20101.2306', 'token')).rejects.toMatchObject({ status: 404 });
  });
});
