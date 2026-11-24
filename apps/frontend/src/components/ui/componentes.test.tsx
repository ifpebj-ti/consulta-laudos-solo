import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { DatePicker } from '@/components/ui/DatePicker';
import { FaixaPaginada } from '@/features/laudos/analista/FaixaPaginada';

describe('Card', () => {
  it('renderiza cabeçalho com título, subtítulo e ação', () => {
    render(
      <Card className="extra">
        <CardHeader title="Título" subtitle="Sub" action={<button type="button">Ação</button>} />
        <CardBody>Conteúdo</CardBody>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo').closest('.card')).toHaveClass('extra');
  });

  it('omite o subtítulo quando não informado', () => {
    render(<CardHeader title="Só título" />);
    expect(document.querySelector('.card__subtitle')).toBeNull();
  });
});

describe('TextField', () => {
  it('propaga mudanças e marca obrigatório', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(<TextField id="nome" label="Nome" value="" onChange={aoMudar} required />);
    await usuario.type(screen.getByLabelText(/Nome/), 'a');
    expect(aoMudar).toHaveBeenCalledWith('a');
    expect(screen.getByLabelText(/Nome/)).toBeRequired();
  });

  it('associa a mensagem de erro ao campo', () => {
    render(<TextField id="email" label="E-mail" value="x" onChange={() => undefined} erro="Inválido" />);
    const campo = screen.getByLabelText('E-mail');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAttribute('aria-describedby', 'email-erro');
    expect(screen.getByText('Inválido')).toBeInTheDocument();
  });
});

describe('DatePicker', () => {
  it('mostra placeholder, abre o calendário e escolhe um dia', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(<DatePicker id="data" value="" onChange={aoMudar} />);
    expect(screen.getByText('dd/mm/aaaa')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /dd\/mm\/aaaa/ }));
    expect(await screen.findByRole('dialog', { name: 'Escolher data' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /15 de/ }));
    expect(aoMudar).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe a data formatada e navega entre meses', async () => {
    const usuario = userEvent.setup();
    render(<DatePicker value="2026-03-10" onChange={() => undefined} />);
    expect(screen.getByText('10/03/2026')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /10\/03\/2026/ }));
    expect(await screen.findByText('Março 2026')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Abril 2026')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Fevereiro 2026')).toBeInTheDocument();
  });

  it('funciona pelo teclado: abre, move foco, seleciona e fecha com Escape', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(<DatePicker value="2026-03-10" onChange={aoMudar} />);
    const gatilho = screen.getByRole('button', { name: /10\/03\/2026/ });
    gatilho.focus();
    await usuario.keyboard('{ArrowDown}');
    await screen.findByRole('dialog');
    await usuario.keyboard('{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}{Home}{End}{PageDown}{PageUp}');
    await usuario.keyboard('{Enter}');
    expect(aoMudar).toHaveBeenCalledTimes(1);

    await usuario.keyboard('{Enter}');
    await screen.findByRole('dialog');
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gatilho).toHaveFocus();
  });

  it('fecha ao clicar fora e escolhe hoje pelo atalho', async () => {
    const aoMudar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <>
        <p>fora</p>
        <DatePicker value="2026-03-10" onChange={aoMudar} invalido />
      </>,
    );
    await usuario.click(screen.getByRole('button', { name: /10\/03\/2026/ }));
    await screen.findByRole('dialog');
    expect(screen.getByText(/Selecionada:/)).toBeInTheDocument();
    await usuario.click(screen.getByText('fora'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /10\/03\/2026/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Hoje' }));
    expect(aoMudar).toHaveBeenCalledTimes(1);
  });
});

describe('FaixaPaginada', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  const itens = (n: number) => Array.from({ length: n }, (_, i) => <div key={i}>Item {i + 1}</div>);

  it('modo faixa renderiza todos os itens e rola entre páginas', async () => {
    const usuario = userEvent.setup();
    render(<FaixaPaginada itens={itens(3)} />);
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    const proxima = screen.queryByLabelText('Próxima página');
    if (proxima) {
      await usuario.click(proxima);
      await usuario.click(screen.getByLabelText('Página anterior'));
    }
  });

  it('modo expandido pagina em grupos de 9 e navega', async () => {
    const usuario = userEvent.setup();
    render(<FaixaPaginada itens={itens(20)} expandida chaveReinicio="a" />);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('Item 9')).toBeInTheDocument();
    expect(screen.queryByText('Item 10')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();

    await usuario.click(screen.getByLabelText('Próxima página'));
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Item 10')).toBeInTheDocument();
    await usuario.click(screen.getByLabelText('Próxima página'));
    expect(screen.getByLabelText('Próxima página')).toBeDisabled();
    await usuario.click(screen.getByLabelText('Página anterior'));
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('volta à primeira página quando a chave de reinício muda', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<FaixaPaginada itens={itens(20)} expandida chaveReinicio="a" />);
    await usuario.click(screen.getByLabelText('Próxima página'));
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    rerender(<FaixaPaginada itens={itens(20)} expandida chaveReinicio="b" />);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
  });
});
