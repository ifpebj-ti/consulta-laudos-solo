import { useCallback, useEffect, useState } from 'react';
import { analiseService, type ItemListagemAmostra, type ListarAmostrasParametros } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { numeroOuNulo, textoOuNulo } from '@/services/respostasApi';
import { normalizarStatusLaudo } from '@/lib/statusLaudo';
import type { CartaoAmostra, StatusAmostra } from './tipos';

export const TAMANHO_PAGINA_SERVIDOR = 100;

export function statusLocalDoServidor(status: string | null | undefined): StatusAmostra {
  switch (normalizarStatusLaudo(status)) {
    case 'CONCLUIDO':
      return 'concluido';
    case 'PENDENTE':
      return 'nao_iniciado';
    case 'AGUARDANDO_HOMOLOGACAO':
      return 'aguardando_homologacao';
    default:
      return 'em_andamento';
  }
}

export function cartaoDoServidor(item: ItemListagemAmostra): CartaoAmostra | null {
  const bruto = item as unknown as Record<string, unknown>;
  const protocolo = textoOuNulo(bruto.protocolo)?.trim();
  if (!protocolo) return null;
  return {
    protocolo,
    solicitante: textoOuNulo(bruto.solicitante) ?? '',
    propriedade: textoOuNulo(bruto.propriedade) ?? '',
    prazo: textoOuNulo(bruto.prazo) ?? '',
    atualizadaEm: textoOuNulo(bruto.atualizadoEm) ?? undefined,
    status: statusLocalDoServidor(textoOuNulo(bruto.status)),
  };
}

export type ConsultaListagem = Omit<ListarAmostrasParametros, 'pagina' | 'tamanhoPagina'>;

export type ModoPaginacao = 'paginas' | 'carregar_mais';

interface PaginaCarregada {
  cartoes: CartaoAmostra[];
  total: number | null;
  pagina: number;
}

export interface ListagemServidor {
  ativa: boolean;
  carregandoInicial: boolean;
  carregando: boolean;
  erro: string | null;
  cartoes: CartaoAmostra[];
  total: number | null;
  pagina: number;
  totalPaginas: number | null;
  modo: ModoPaginacao;
  temMais: boolean;
  irPara: (pagina: number) => void;
  carregarMais: () => void;
  tentarNovamente: () => void;
}

export function ultimaPaginaValida(total: number, tamanho = TAMANHO_PAGINA_SERVIDOR): number {
  return Math.max(1, Math.ceil(total / tamanho));
}

function mensagemErro(erro: unknown): string {
  return erro instanceof ApiError ? erro.message : 'Não foi possível carregar as amostras.';
}

export function useListagemServidor(
  ativa: boolean,
  token: string | undefined,
  consulta: ConsultaListagem,
  recarga = 0,
): ListagemServidor {
  const chave = JSON.stringify(consulta);
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<PaginaCarregada | null>(null);
  const [acumulados, setAcumulados] = useState<CartaoAmostra[]>([]);
  const [carregando, setCarregando] = useState(ativa);
  const [erro, setErro] = useState<string | null>(null);
  const [fim, setFim] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    setPagina(1);
    setAcumulados([]);
    setFim(false);
  }

  useEffect(() => {
    if (!ativa || !token) {
      setCarregando(false);
      return;
    }
    const controlador = new AbortController();
    const parametros = JSON.parse(chave) as ConsultaListagem;
    setCarregando(true);
    setErro(null);
    analiseService
      .listarAmostras({ ...parametros, pagina, tamanhoPagina: TAMANHO_PAGINA_SERVIDOR }, token, controlador.signal)
      .then((res) => {
        const dadosBrutos = (res as { dados?: { itens?: unknown; total?: unknown } } | null)?.dados;
        if (!dadosBrutos || !Array.isArray(dadosBrutos.itens)) throw new ApiError(200, 'O servidor enviou uma resposta inválida.', 'INVALID_RESPONSE');
        const cartoes = (dadosBrutos.itens as ItemListagemAmostra[])
          .map(cartaoDoServidor)
          .filter((c): c is CartaoAmostra => c !== null);
        const totalBruto = numeroOuNulo(dadosBrutos.total);
        const total = totalBruto !== null && totalBruto >= 0 ? Math.floor(totalBruto) : null;

        if (cartoes.length === 0 && pagina > 1) {
          if (total !== null) {
            const ultima = ultimaPaginaValida(total);
            if (ultima < pagina) {
              setPagina(ultima);
              return;
            }
          } else {
            setFim(true);
            setCarregando(false);
            return;
          }
        }

        setDados({ cartoes, total, pagina });
        if (total === null) {
          setAcumulados((atual) => (pagina === 1 ? cartoes : [...atual, ...cartoes.filter((c) => !atual.some((a) => a.protocolo === c.protocolo))]));
          setFim(cartoes.length < TAMANHO_PAGINA_SERVIDOR);
        }
        setCarregando(false);
      })
      .catch((falha: unknown) => {
        if (falha instanceof ApiError && falha.foiCancelada) return;
        setErro(mensagemErro(falha));
        setCarregando(false);
      });
    return () => controlador.abort();
  }, [ativa, token, chave, pagina, recarga, tentativa]);

  const total = dados?.total ?? null;
  const modo: ModoPaginacao = dados && total === null ? 'carregar_mais' : 'paginas';
  const totalPaginas = total !== null ? ultimaPaginaValida(total) : null;

  const irPara = useCallback(
    (destino: number) => {
      const limite = totalPaginas ?? Number.POSITIVE_INFINITY;
      setPagina(Math.min(Math.max(1, Math.floor(destino)), limite));
    },
    [totalPaginas],
  );

  return {
    ativa,
    carregandoInicial: ativa && carregando && !dados,
    carregando,
    erro,
    cartoes: modo === 'carregar_mais' ? acumulados : (dados?.cartoes ?? []),
    total,
    pagina: dados?.pagina ?? pagina,
    totalPaginas,
    modo,
    temMais: modo === 'carregar_mais' ? !fim : totalPaginas !== null && (dados?.pagina ?? 1) < totalPaginas,
    irPara,
    carregarMais: () => {
      if (!carregando && !fim) setPagina((p) => p + 1);
    },
    tentarNovamente: () => setTentativa((n) => n + 1),
  };
}
