import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './Select.css';

export interface OpcaoSelect<T extends string> {
  valor: T;
  rotulo: string;
}

interface SelectProps<T extends string> {
  id?: string;
  value: T | '';
  opcoes: OpcaoSelect<T>[];
  onChange: (valor: T) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Destaca em vermelho quando a validação do formulário falha. */
  invalido?: boolean;
  /** "campo" acompanha os inputs de formulário; "compacto" é para barras de filtro. */
  variante?: 'campo' | 'compacto';
  className?: string;
}

interface Posicao {
  top: number;
  left: number;
  width: number;
}

/**
 * Seletor próprio no lugar do <select> nativo, cuja lista aberta não aceita estilo.
 * A lista é renderizada num portal com posição fixa para não ser cortada por
 * containers com overflow (ex.: o modal).
 */
export function Select<T extends string>({
  id,
  value,
  opcoes,
  onChange,
  placeholder = 'Selecione...',
  ariaLabel,
  invalido = false,
  variante = 'campo',
  className = '',
}: SelectProps<T>) {
  const idLista = useId();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [posicao, setPosicao] = useState<Posicao | null>(null);

  const selecionada = opcoes.find((opcao) => opcao.valor === value);

  const fechar = useCallback(() => setAberto(false), []);

  const abrir = useCallback(() => {
    const indiceAtual = opcoes.findIndex((opcao) => opcao.valor === value);
    setAtivo(indiceAtual >= 0 ? indiceAtual : 0);
    setAberto(true);
  }, [opcoes, value]);

  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return;
    const ret = botaoRef.current.getBoundingClientRect();
    setPosicao({ top: ret.bottom + 4, left: ret.left, width: ret.width });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (!botaoRef.current?.contains(alvo) && !listaRef.current?.contains(alvo)) fechar();
    }
    function aoRolar(evento: Event) {
      if (!listaRef.current?.contains(evento.target as Node)) fechar();
    }
    document.addEventListener('mousedown', aoClicarFora);
    window.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      window.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto, fechar]);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current?.children[ativo]?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativo]);

  function escolher(indice: number) {
    const opcao = opcoes[indice];
    if (opcao) onChange(opcao.valor);
    fechar();
    botaoRef.current?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>) {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(evento.key)) {
        evento.preventDefault();
        abrir();
      }
      return;
    }
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        setAtivo((i) => Math.min(opcoes.length - 1, i + 1));
        break;
      case 'ArrowUp':
        evento.preventDefault();
        setAtivo((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        evento.preventDefault();
        setAtivo(0);
        break;
      case 'End':
        evento.preventDefault();
        setAtivo(opcoes.length - 1);
        break;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        escolher(ativo);
        break;
      case 'Escape':
        // Não deixa o Esc chegar ao modal: fecha só a lista
        evento.preventDefault();
        evento.stopPropagation();
        fechar();
        break;
      case 'Tab':
        fechar();
        break;
    }
  }

  const classes = [
    'select',
    `select--${variante}`,
    aberto ? 'select--aberto' : '',
    invalido ? 'select--invalido' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        ref={botaoRef}
        id={id}
        type="button"
        className={classes}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-label={ariaLabel}
        aria-invalid={invalido || undefined}
        aria-activedescendant={aberto ? `${idLista}-${ativo}` : undefined}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoTeclar}
      >
        <span className={selecionada ? 'select__valor' : 'select__valor select__valor--vazio'}>
          {selecionada?.rotulo ?? placeholder}
        </span>
        <svg className="select__seta" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <ul
            ref={listaRef}
            id={idLista}
            role="listbox"
            className="select__lista"
            style={{ top: posicao.top, left: posicao.left, minWidth: posicao.width }}
          >
            {opcoes.map((opcao, indice) => {
              const marcada = opcao.valor === value;
              return (
                <li
                  key={opcao.valor}
                  id={`${idLista}-${indice}`}
                  role="option"
                  aria-selected={marcada}
                  className={[
                    'select__opcao',
                    indice === ativo ? 'select__opcao--ativa' : '',
                    marcada ? 'select__opcao--marcada' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setAtivo(indice)}
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => escolher(indice)}
                >
                  <span>{opcao.rotulo}</span>
                  {marcada && (
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
