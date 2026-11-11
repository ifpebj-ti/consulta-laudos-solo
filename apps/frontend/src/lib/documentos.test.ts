import { describe, expect, it } from 'vitest';
import {
  cpfValido,
  formatarCpf,
  formatarTelefone,
  validarCpf,
  validarProtocoloCadastro,
  validarProtocoloConsulta,
} from './documentos';

describe('CPF', () => {
  it('aceita CPF com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  it('rejeita dígito verificador errado, sequência repetida e tamanho incorreto', () => {
    expect(cpfValido('52998224724')).toBe(false);
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('5299822472')).toBe(false);
  });

  it('formata progressivamente e limita a 11 dígitos', () => {
    expect(formatarCpf('529')).toBe('529');
    expect(formatarCpf('5299')).toBe('529.9');
    expect(formatarCpf('5299822')).toBe('529.982.2');
    expect(formatarCpf('529982247259999')).toBe('529.982.247-25');
  });

  it('retorna mensagens específicas de validação', () => {
    expect(validarCpf('')).toBe('Informe o CPF do titular.');
    expect(validarCpf('123')).toBe('O CPF precisa ter 11 dígitos.');
    expect(validarCpf('111.111.111-11')).toMatch(/inválido/);
    expect(validarCpf('529.982.247-25')).toBeNull();
  });
});

describe('protocolo', () => {
  it('valida o formato aceito pela consulta do cliente', () => {
    expect(validarProtocoloConsulta('')).toBe('Informe o número do protocolo.');
    expect(validarProtocoloConsulta('ABC')).toMatch(/entre 8 e 30/);
    expect(validarProtocoloConsulta('LAB 2026 01')).toMatch(/apenas letras/);
    expect(validarProtocoloConsulta(' lab-2026-0142 ')).toBeNull();
    expect(validarProtocoloConsulta('20101.2306')).toBeNull();
  });

  it('valida o formato aceito no cadastro de amostra', () => {
    expect(validarProtocoloCadastro('')).toMatch(/Preencha/);
    expect(validarProtocoloCadastro('LAB/2026_01')).toBeNull();
    expect(validarProtocoloCadastro('LAB 01')).toMatch(/3 a 32/);
  });
});

describe('telefone', () => {
  it('aplica máscara de fixo e celular', () => {
    expect(formatarTelefone('81')).toBe('(81');
    expect(formatarTelefone('8133334444')).toBe('(81) 3333-4444');
    expect(formatarTelefone('81999998888')).toBe('(81) 99999-8888');
  });
});
