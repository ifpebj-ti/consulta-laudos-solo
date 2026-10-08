import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './FaixaPaginada.css';

/** No modo expandido cada página é uma grade de até 3x3 cartões. */
const CARTOES_POR_PAGINA_EXPANDIDA = 9;

interface FaixaPaginadaProps {
  /** Um item por cartão. */
  itens: ReactNode[];
  /** Muda quando a lista é refiltrada/reordenada, para voltar à primeira página. */
  chaveReinicio?: string;
  /** Expandida: grade de até 3x3 por página. Retraída: uma linha com rolagem horizontal. */
  expandida?: boolean;
}

const DURACAO_ROLAGEM_MS = 450;

const suavizar = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function prefereMenosMovimento() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Rolagem animada própria (em vez de scrollTo smooth), para a troca de página
 * ter sempre a mesma duração e curva. O snap fica desligado durante a animação
 * para não "puxar" o trilho no meio do caminho.
 */
function animarRolagem(trilho: HTMLDivElement, destino: number, aoTerminar: () => void) {
  const inicio = trilho.scrollLeft;
  const distancia = destino - inicio;
  if (distancia === 0 || prefereMenosMovimento()) {
    trilho.scrollLeft = destino;
    aoTerminar();
    return () => undefined;
  }
  trilho.classList.add('faixa-paginada__trilho--animando');
  const t0 = performance.now();
  let quadro = 0;
  const passo = (agora: number) => {
    const progresso = Math.min(1, (agora - t0) / DURACAO_ROLAGEM_MS);
    trilho.scrollLeft = inicio + distancia * suavizar(progresso);
    if (progresso < 1) {
      quadro = requestAnimationFrame(passo);
    } else {
      trilho.classList.remove('faixa-paginada__trilho--animando');
      aoTerminar();
    }
  };
  quadro = requestAnimationFrame(passo);
  return () => {
    cancelAnimationFrame(quadro);
    trilho.classList.remove('faixa-paginada__trilho--animando');
  };
}

/** Quantos cartões cabem na largura visível e quanto rolar para avançar uma página. */
function medirPaginacao(trilho: HTMLDivElement) {
  const primeiro = trilho.firstElementChild as HTMLElement | null;
  if (!primeiro) return { porPagina: 1, passo: trilho.clientWidth };
  const gap = parseFloat(getComputedStyle(trilho).columnGap) || 0;
  const larguraCartao = primeiro.offsetWidth + gap;
  const porPagina = Math.max(1, Math.floor((trilho.clientWidth + gap) / larguraCartao));
  return { porPagina, passo: porPagina * larguraCartao };
}

function ControlesPaginacao({
  pagina,
  totalPaginas,
  onAnterior,
  onProxima,
}: {
  pagina: number;
  totalPaginas: number;
  onAnterior: () => void;
  onProxima: () => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="faixa-paginada__controles">
      <button
        type="button"
        className="faixa-paginada__seta"
        onClick={onAnterior}
        disabled={pagina <= 1}
        aria-label="Página anterior"
      >
        ‹
      </button>
      <span className="faixa-paginada__indicador">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        className="faixa-paginada__seta"
        onClick={onProxima}
        disabled={pagina >= totalPaginas}
        aria-label="Próxima página"
      >
        ›
      </button>
    </div>
  );
}

export function FaixaPaginada({ itens, chaveReinicio, expandida = false }: FaixaPaginadaProps) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const cancelarAnimacaoRef = useRef<() => void>(() => undefined);

  // Modo retraído: página derivada da posição de rolagem
  const [paginaFaixa, setPaginaFaixa] = useState(1);
  const [totalPaginasFaixa, setTotalPaginasFaixa] = useState(1);

  // Modo expandido: página da grade 3x3
  const [paginaGrade, setPaginaGrade] = useState(1);
  const [direcaoGrade, setDirecaoGrade] = useState<'proxima' | 'anterior' | null>(null);
  const totalPaginasGrade = Math.max(1, Math.ceil(itens.length / CARTOES_POR_PAGINA_EXPANDIDA));

  const atualizarFaixa = useCallback(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    const { porPagina, passo } = medirPaginacao(trilho);
    const total = Math.max(1, Math.ceil(trilho.childElementCount / porPagina));
    const fimAlcancado = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 1;
    setTotalPaginasFaixa(total);
    setPaginaFaixa(fimAlcancado ? total : Math.min(total, Math.round(trilho.scrollLeft / passo) + 1));
  }, []);

  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    atualizarFaixa();
    const observador = new ResizeObserver(atualizarFaixa);
    observador.observe(trilho);
    return () => observador.disconnect();
  }, [atualizarFaixa, itens.length, expandida]);

  useEffect(() => {
    cancelarAnimacaoRef.current();
    trilhoRef.current?.scrollTo({ left: 0 });
    setPaginaGrade(1);
    setDirecaoGrade(null);
    atualizarFaixa();
  }, [chaveReinicio, atualizarFaixa]);

  // Se a lista encolher, não deixa a grade presa numa página que não existe mais
  useEffect(() => {
    setPaginaGrade((atual) => Math.min(atual, totalPaginasGrade));
  }, [totalPaginasGrade]);

  function rolarFaixa(direcao: 1 | -1) {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    const { passo } = medirPaginacao(trilho);
    const proxima = Math.min(totalPaginasFaixa, Math.max(1, paginaFaixa + direcao));
    const destino = Math.min((proxima - 1) * passo, trilho.scrollWidth - trilho.clientWidth);
    setPaginaFaixa(proxima);
    cancelarAnimacaoRef.current();
    cancelarAnimacaoRef.current = animarRolagem(trilho, destino, atualizarFaixa);
  }

  useEffect(() => () => cancelarAnimacaoRef.current(), []);

  function mudarPaginaGrade(direcao: 1 | -1) {
    setDirecaoGrade(direcao === 1 ? 'proxima' : 'anterior');
    setPaginaGrade((p) => Math.min(totalPaginasGrade, Math.max(1, p + direcao)));
  }

  if (expandida) {
    const inicio = (paginaGrade - 1) * CARTOES_POR_PAGINA_EXPANDIDA;
    return (
      <div className="faixa-paginada">
        <div className="faixa-paginada__janela">
          {/* A key nova a cada página reinicia a animação de entrada */}
          <div
            key={paginaGrade}
            className={`faixa-paginada__grade ${direcaoGrade ? `faixa-paginada__grade--${direcaoGrade}` : ''}`.trim()}
          >
            {itens.slice(inicio, inicio + CARTOES_POR_PAGINA_EXPANDIDA)}
          </div>
        </div>
        <ControlesPaginacao
          pagina={paginaGrade}
          totalPaginas={totalPaginasGrade}
          onAnterior={() => mudarPaginaGrade(-1)}
          onProxima={() => mudarPaginaGrade(1)}
        />
      </div>
    );
  }

  return (
    <div className="faixa-paginada">
      <div className="faixa-paginada__trilho" ref={trilhoRef} onScroll={atualizarFaixa}>
        {itens}
      </div>
      <ControlesPaginacao
        pagina={paginaFaixa}
        totalPaginas={totalPaginasFaixa}
        onAnterior={() => rolarFaixa(-1)}
        onProxima={() => rolarFaixa(1)}
      />
    </div>
  );
}
