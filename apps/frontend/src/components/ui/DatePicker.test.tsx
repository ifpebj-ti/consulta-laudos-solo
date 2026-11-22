import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('renderiza placeholder quando vazio e data formatada quando preenchido', () => {
    const { rerender } = render(<DatePicker id="dp" value="" onChange={() => undefined} placeholder="dd/mm/aaaa" />);
    expect(screen.getByRole('button')).toHaveTextContent('dd/mm/aaaa');

    rerender(<DatePicker id="dp" value="2026-11-15" onChange={() => undefined} />);
    expect(screen.getByRole('button')).toHaveTextContent('15/11/2026');
  });

  it('abre o calendário, navega entre meses, seleciona dia e devolve o foco ao botão', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(<DatePicker id="dp" value="2026-11-15" onChange={aoMudar} />);

    const gatilho = screen.getByRole('button');
    await usuario.click(gatilho);

    const dialogo = await screen.findByRole('dialog', { name: 'Escolher data' });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Dezembro 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /20 de Novembro de 2026/ }));

    expect(aoMudar).toHaveBeenCalledWith('2026-11-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gatilho).toHaveFocus();
  });

  it('fecha com Escape devolvendo o foco, fecha ao clicar fora e atalho Hoje seleciona data atual', async () => {
    function Exemplo() {
      const [data, setData] = useState('2026-11-10');
      return (
        <div>
          <button type="button">Fora</button>
          <DatePicker id="dp" value={data} onChange={setData} />
        </div>
      );
    }

    const usuario = userEvent.setup();
    render(<Exemplo />);

    const gatilho = screen.getByRole('button', { name: '10/11/2026' });
    await usuario.click(gatilho);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gatilho).toHaveFocus();

    await usuario.click(gatilho);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await usuario.click(gatilho);
    await usuario.click(screen.getByRole('button', { name: 'Hoje' }));

    const agora = new Date();
    const esperado = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`;
    expect(gatilho).toHaveTextContent(esperado);
  });
});
