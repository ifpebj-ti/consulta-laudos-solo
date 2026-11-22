import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DecimalInput } from './DecimalInput';

describe('DecimalInput', () => {
  it('aceita vírgula ou ponto e repassa o número no onChange', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(<DecimalInput id="campo-num" aria-label="Medido" value={0} onChange={aoMudar} />);

    const input = screen.getByLabelText('Medido');
    expect(input).toHaveValue('0');

    await usuario.clear(input);
    expect(input).toHaveValue('');
    // Limpar o campo não chama onChange com NaN/null enquanto o usuário digita
    expect(aoMudar).not.toHaveBeenCalled();

    await usuario.type(input, '5,42');
    expect(aoMudar).toHaveBeenLastCalledWith(5.42);

    await usuario.clear(input);
    await usuario.type(input, '7.8');
    expect(aoMudar).toHaveBeenLastCalledWith(7.8);
  });

  it('sincroniza o texto exibido quando a prop value muda externamente', () => {
    const { rerender } = render(<DecimalInput aria-label="Medido" value={1.5} onChange={() => undefined} />);
    expect(screen.getByLabelText('Medido')).toHaveValue('1.5');

    rerender(<DecimalInput aria-label="Medido" value={9.25} onChange={() => undefined} />);
    expect(screen.getByLabelText('Medido')).toHaveValue('9.25');
  });
});
