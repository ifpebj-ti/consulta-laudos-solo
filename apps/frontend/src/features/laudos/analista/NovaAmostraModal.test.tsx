import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NovaAmostraModal } from './NovaAmostraModal';
import { IDENTIFICACAO_VAZIA, type Identificacao } from './tipos';

function Exemplo({
  inicial = IDENTIFICACAO_VAZIA,
  aoCriar = () => undefined,
  erro = null,
  carregando = false,
}: {
  inicial?: Identificacao;
  aoCriar?: () => void;
  erro?: string | null;
  carregando?: boolean;
}) {
  const [identificacao, setIdentificacao] = useState(inicial);
  return (
    <NovaAmostraModal
      isOpen
      identificacao={identificacao}
      onChange={setIdentificacao}
      onClose={() => undefined}
      onCriar={aoCriar}
      erro={erro}
      carregando={carregando}
    />
  );
}

describe('NovaAmostraModal', () => {
  it('bloqueia o envio e foca o primeiro campo inválido', async () => {
    const aoCriar = vi.fn();
    const usuario = userEvent.setup();
    render(<Exemplo aoCriar={aoCriar} />);
    await usuario.click(screen.getByRole('button', { name: /Continuar para o Registro/ }));
    expect(aoCriar).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Protocolo/)).toHaveFocus();
    expect(screen.getAllByText('Preencha este campo para continuar.').length).toBeGreaterThan(0);
    expect(screen.getByText('Escolha o tipo da análise.')).toBeInTheDocument();
    expect(screen.getByText('Informe a data em que a amostra chegou.')).toBeInTheDocument();
  });

  it('limpa o erro do campo ao digitar, aplica máscaras e valida contato', async () => {
    const usuario = userEvent.setup();
    render(<Exemplo />);
    await usuario.click(screen.getByRole('button', { name: /Continuar para o Registro/ }));
    const solicitante = screen.getByLabelText(/Proprietário\/Solicitante/);
    expect(solicitante).toHaveAttribute('aria-invalid', 'true');
    await usuario.type(solicitante, 'Maria');
    expect(solicitante).not.toHaveAttribute('aria-invalid');

    await usuario.type(screen.getByLabelText(/CPF do Solicitante/), '52998224725');
    expect(screen.getByLabelText(/CPF do Solicitante/)).toHaveValue('529.982.247-25');

    await usuario.type(screen.getByLabelText('E-mail'), 'invalido');
    await usuario.type(screen.getByLabelText(/Telefone/), '8199');
    await usuario.click(screen.getByRole('button', { name: /Continuar para o Registro/ }));
    expect(screen.getByText(/Confira o e-mail/)).toBeInTheDocument();
    expect(screen.getByText(/Informe o DDD/)).toBeInTheDocument();
  });

  it('mostra erro do servidor e estado de carregamento', () => {
    render(<Exemplo erro="Protocolo já cadastrado" carregando />);
    expect(screen.getByRole('alert')).toHaveTextContent('Protocolo já cadastrado');
    expect(screen.getByRole('button', { name: /Cadastrando Amostra/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('preenche dados de teste em desenvolvimento e envia quando válido', async () => {
    const aoCriar = vi.fn();
    const usuario = userEvent.setup();
    render(<Exemplo aoCriar={aoCriar} />);
    await usuario.click(screen.getByRole('button', { name: 'Preencher dados de teste' }));
    await usuario.click(screen.getByRole('button', { name: /Continuar para o Registro/ }));
    expect(aoCriar).toHaveBeenCalledTimes(1);
  });
});
