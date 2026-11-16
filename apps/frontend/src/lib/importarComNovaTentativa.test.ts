import { describe, expect, it, vi } from 'vitest';
import { importarComNovaTentativa } from './importarComNovaTentativa';

describe('importarComNovaTentativa', () => {
  it('tenta de novo uma vez quando o carregamento da tela falha', async () => {
    vi.useFakeTimers();
    const importar = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module')).mockResolvedValueOnce('tela');
    const promessa = importarComNovaTentativa(importar);
    await vi.runAllTimersAsync();
    await expect(promessa).resolves.toBe('tela');
    expect(importar).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('desiste depois das tentativas e repassa o erro', async () => {
    vi.useFakeTimers();
    const importar = vi.fn().mockRejectedValue(new Error('offline'));
    const promessa = importarComNovaTentativa(importar);
    const verificacao = expect(promessa).rejects.toThrow('offline');
    await vi.runAllTimersAsync();
    await verificacao;
    expect(importar).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
