import { TAMANHO_PAGINA_SERVIDOR, type ListagemServidor } from './useAmostrasServidor';

export function PaginacaoServidor({ listagem, rotulo }: { listagem: ListagemServidor; rotulo: string }) {
  if (!listagem.ativa || listagem.carregandoInicial) return null;
  const { modo, total, pagina, totalPaginas, carregando, temMais } = listagem;

  if (modo === 'carregar_mais') {
    return (
      <div className="dashboard-paginacao" aria-label={`Paginação de ${rotulo}`} role="navigation">
        <span className="dashboard-paginacao__resumo" aria-live="polite">
          {listagem.cartoes.length} {listagem.cartoes.length === 1 ? 'amostra carregada' : 'amostras carregadas'}
          {temMais ? '' : ' (todas)'}
        </span>
        {temMais && (
          <button type="button" className="link-acao" onClick={listagem.carregarMais} disabled={carregando}>
            {carregando ? 'Carregando…' : 'Carregar mais'}
          </button>
        )}
      </div>
    );
  }

  if (total === null || totalPaginas === null || totalPaginas <= 1) {
    return total !== null && total > 0 ? (
      <div className="dashboard-paginacao" aria-label={`Paginação de ${rotulo}`} role="navigation">
        <span className="dashboard-paginacao__resumo">
          {total} {total === 1 ? 'amostra' : 'amostras'}
        </span>
      </div>
    ) : null;
  }

  const inicio = (pagina - 1) * TAMANHO_PAGINA_SERVIDOR + 1;
  const fim = Math.min(pagina * TAMANHO_PAGINA_SERVIDOR, total);

  return (
    <div className="dashboard-paginacao" aria-label={`Paginação de ${rotulo}`} role="navigation">
      <button type="button" className="link-acao" onClick={() => listagem.irPara(pagina - 1)} disabled={carregando || pagina <= 1}>
        {TAMANHO_PAGINA_SERVIDOR} anteriores
      </button>
      <span className="dashboard-paginacao__resumo" aria-live="polite">
        Amostras {inicio}–{fim} de {total} · lote {pagina} de {totalPaginas}
        {carregando ? ' · carregando…' : ''}
      </span>
      <button
        type="button"
        className="link-acao"
        onClick={() => listagem.irPara(pagina + 1)}
        disabled={carregando || pagina >= totalPaginas}
      >
        Próximas {TAMANHO_PAGINA_SERVIDOR}
      </button>
    </div>
  );
}
