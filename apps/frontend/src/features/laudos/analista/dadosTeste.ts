import { hojeIso } from './statusAmostra';
import type { Identificacao } from './tipos';

/**
 * Dados fictícios para agilizar testes manuais do fluxo até o laudo.
 * Usado apenas em desenvolvimento (import.meta.env.DEV) — não aparece no build de produção.
 */
export function gerarIdentificacaoTeste(): Identificacao {
  const sufixo = Date.now().toString().slice(-6);
  return {
    protocolo: `LAB-TESTE-${sufixo}`,
    cpfCliente: '529.982.247-25',
    dataRecebimento: hojeIso(),
    prazo: '',
    tipoAnalise: 'fisico_quimica',
    solicitante: 'José Teste da Silva',
    dataEmissao: '',
    propriedade: 'Sítio Boa Esperança',
    localizacao: 'Belo Jardim - PE',
    areaIdentificacao: 'Gleba A / Talhão 3',
    areaHectares: '12.5',
    profundidadeColeta: '0-20 cm',
    cultivo: 'Milho',
    culturaExistente: 'Pastagem',
    email: 'jose.teste@exemplo.com',
    telefone: '(81) 99999-8888',
  };
}
