import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalibracaoSecao, MENSAGEM_FATOR_DILUICAO_INVALIDO } from './CalibracaoSecao';

describe('calculadora de fósforo com fator de diluição', () => {
  it('começa com fator 10 e avisa fator inválido sem calcular', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <CalibracaoSecao
        calibracaoAplicada={null}
        onAplicar={() => undefined}
        leituraAmostra={0.292}
        onLeituraAmostraChange={() => undefined}
        fatorDiluicao={10}
        onFatorDiluicaoChange={aoMudar}
      />,
    );
    const campo = screen.getByLabelText('Fator de diluição');
    expect(campo).toHaveValue(10);
    await usuario.clear(campo);
    await usuario.type(campo, '0');
    expect(screen.getByRole('alert')).toHaveTextContent(MENSAGEM_FATOR_DILUICAO_INVALIDO);
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Fator inválido')).toBeInTheDocument();
    expect(aoMudar).toHaveBeenLastCalledWith(0);
  });
});
