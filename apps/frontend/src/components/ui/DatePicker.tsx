import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './DatePicker.css';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_SEMANA_EXTENSO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Datas trafegam como AAAA-MM-DD (mesmo formato do input date nativo). */
function paraIso(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function deIso(valor: string): Date | null {
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

function formatarExibicao(valor: string): string {
  const data = deIso(valor);
  if (!data) return '';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

/** 6 semanas fixas (42 dias) começando no domingo anterior ao dia 1, para o calendário não "pular" de altura. */
function diasDoMes(ano: number, mes: number): Date[] {
  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
}

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  invalido?: boolean;
  ariaDescribedBy?: string;
}

interface Posicao {
  top: number;
  left: number;
}

const LARGURA_CALENDARIO = 296;
const ALTURA_CALENDARIO = 352;

/** Calendário próprio no lugar do pop-up nativo do input date. */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  invalido = false,
  ariaDescribedBy,
}: DatePickerProps) {
  const idDialogo = useId();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  // Dia com foco do teclado; também define o mês exibido
  const [foco, setFoco] = useState<Date>(() => deIso(value) ?? new Date());

  const hoje = paraIso(new Date());
  const mesExibido = foco.getMonth();
  const anoExibido = foco.getFullYear();
  const dias = diasDoMes(anoExibido, mesExibido);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  }, []);

  function abrir() {
    setFoco(deIso(value) ?? new Date());
    setAberto(true);
  }

  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return;
    const ret = botaoRef.current.getBoundingClientRect();
    // Abre para cima quando não couber abaixo do campo
    const cabeAbaixo = ret.bottom + 6 + ALTURA_CALENDARIO <= window.innerHeight;
    const top = cabeAbaixo ? ret.bottom + 6 : Math.max(8, ret.top - 6 - ALTURA_CALENDARIO);
    const left = Math.min(ret.left, window.innerWidth - LARGURA_CALENDARIO - 8);
    setPosicao({ top, left: Math.max(8, left) });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (!botaoRef.current?.contains(alvo) && !painelRef.current?.contains(alvo)) fechar(false);
    }
    function aoRolar(evento: Event) {
      if (!painelRef.current?.contains(evento.target as Node)) fechar(false);
    }
    function aoRedimensionar() {
      fechar(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    window.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      window.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [aberto, fechar]);

  // Mantém o foco do teclado no dia ativo enquanto navega
  useEffect(() => {
    if (!aberto) return;
    const alvo = gradeRef.current?.querySelector<HTMLButtonElement>(`[data-dia="${paraIso(foco)}"]`);
    alvo?.focus({ preventScroll: true });
  }, [aberto, foco, posicao]);

  function escolher(data: Date) {
    onChange(paraIso(data));
    fechar();
  }

  function moverFoco(dias: number) {
    setFoco((atual) => new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + dias));
  }

  function mudarMes(delta: number) {
    setFoco((atual) => {
      const alvo = new Date(atual.getFullYear(), atual.getMonth() + delta, 1);
      const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
      return new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(atual.getDate(), ultimoDia));
    });
  }

  function aoTeclarGrade(evento: KeyboardEvent<HTMLDivElement>) {
    const acoes: Record<string, () => void> = {
      ArrowLeft: () => moverFoco(-1),
      ArrowRight: () => moverFoco(1),
      ArrowUp: () => moverFoco(-7),
      ArrowDown: () => moverFoco(7),
      PageUp: () => mudarMes(-1),
      PageDown: () => mudarMes(1),
      Home: () => moverFoco(-foco.getDay()),
      End: () => moverFoco(6 - foco.getDay()),
      Enter: () => escolher(foco),
      ' ': () => escolher(foco),
    };
    const acao = acoes[evento.key];
    if (acao) {
      evento.preventDefault();
      acao();
    }
  }

  function aoTeclarBotao(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === 'ArrowDown' || evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrir();
    }
  }

  const textoExibido = formatarExibicao(value);

  return (
    <>
      <button
        ref={botaoRef}
        id={id}
        type="button"
        className={['datepicker', aberto ? 'datepicker--aberto' : '', invalido ? 'datepicker--invalido' : '']
          .filter(Boolean)
          .join(' ')}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={aberto ? idDialogo : undefined}
        aria-invalid={invalido || undefined}
        aria-describedby={ariaDescribedBy}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoTeclarBotao}
      >
        <span className={textoExibido ? 'datepicker__valor' : 'datepicker__valor datepicker__valor--vazio'}>
          {textoExibido || placeholder}
        </span>
        <svg className="datepicker__icone" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 6.5h12M5.5 1.8v2.6M10.5 1.8v2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={painelRef}
            id={idDialogo}
            role="dialog"
            aria-modal="false"
            aria-label="Escolher data"
            className="datepicker__painel"
            style={{ top: posicao.top, left: posicao.left, width: LARGURA_CALENDARIO }}
            onKeyDown={(evento) => {
              if (evento.key === 'Escape') {
                evento.preventDefault();
                evento.stopPropagation();
                fechar();
              }
            }}
          >
            <div className="datepicker__cabecalho">
              <button type="button" className="datepicker__nav" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
                ‹
              </button>
              <span className="datepicker__mes" aria-live="polite">
                {MESES[mesExibido]} {anoExibido}
              </span>
              <button type="button" className="datepicker__nav" onClick={() => mudarMes(1)} aria-label="Próximo mês">
                ›
              </button>
            </div>

            <div className="datepicker__semana" aria-hidden="true">
              {DIAS_SEMANA.map((dia, i) => (
                <span key={i}>{dia}</span>
              ))}
            </div>

            <div ref={gradeRef} className="datepicker__grade" role="grid" onKeyDown={aoTeclarGrade}>
              {dias.map((dia) => {
                const iso = paraIso(dia);
                const foraDoMes = dia.getMonth() !== mesExibido;
                const selecionado = iso === value;
                const ehHoje = iso === hoje;
                const focado = iso === paraIso(foco);
                return (
                  <button
                    key={iso}
                    type="button"
                    data-dia={iso}
                    tabIndex={focado ? 0 : -1}
                    className={[
                      'datepicker__dia',
                      foraDoMes ? 'datepicker__dia--fora' : '',
                      ehHoje ? 'datepicker__dia--hoje' : '',
                      selecionado ? 'datepicker__dia--selecionado' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={`${DIAS_SEMANA_EXTENSO[dia.getDay()]}, ${dia.getDate()} de ${MESES[dia.getMonth()]} de ${dia.getFullYear()}`}
                    aria-pressed={selecionado}
                    onClick={() => escolher(dia)}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="datepicker__rodape">
              <button type="button" className="datepicker__atalho" onClick={() => escolher(new Date())}>
                Hoje
              </button>
              {value && (
                <span className="datepicker__escolhida">
                  Selecionada: <strong>{textoExibido}</strong>
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
