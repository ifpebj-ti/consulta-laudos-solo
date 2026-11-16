import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/layout/BrandMark';
import { Footer } from '@/components/layout/Footer';
import { doisDigitos } from '@/lib/formatos';
import './HomePage.css';


const FOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/fotos/laboratorio-${n}.webp`);
const INTERVALO_MS = 5000;



export function Seta({ direcao = 'direita' }: { direcao?: 'direita' | 'esquerda' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
      {direcao === 'direita' ? <path d="M4 12h15M14 7l5 5-5 5" /> : <path d="M20 12H5M10 7l-5 5 5 5" />}
    </svg>
  );
}

export function SetaVelocidade() {
  return (
    <svg viewBox="0 0 40 24" width="34" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
      <path d="M6 6l6 6-6 6" opacity="0.25" />
      <path d="M15 6l6 6-6 6" opacity="0.55" />
      <path d="M24 6l6 6-6 6" />
    </svg>
  );
}

export function LinhasVelocidade({ className = 'home-velocidade' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g fill="none" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M-60 ${892 - i * 6}C560 ${900 - i * 5} 1040 ${872 - i * 6} 1660 ${230 + i * 16}`}
            stroke={i === 2 ? '#cd191e' : '#2f9e41'}
            opacity={i === 2 ? 0.7 : 0.75 - i * 0.11}
          />
        ))}
      </g>
      <path d="M1600 760A140 140 0 0 0 1460 900" fill="none" stroke="#161412" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

function IconePausar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

function IconeTocar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
      <path d="M8 5l11 7-11 7z" />
    </svg>
  );
}

function Carrossel() {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [pausadoManual, setPausadoManual] = useState(false);

  useEffect(() => {
    if (pausado || pausadoManual || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setAtual((i) => (i + 1) % FOTOS.length), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [pausado, pausadoManual]);

  const ir = (passo: number) => setAtual((i) => (i + passo + FOTOS.length) % FOTOS.length);

  return (
    <aside
      className="home-visual"
      aria-roledescription="carrossel"
      aria-label="Fotos do Laboratório de Solos"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="home-visual__moldura">
        <div className="home-visual__eco" aria-hidden="true" />
        <span className="home-visual__rastro home-visual__rastro--1" aria-hidden="true" />
        <span className="home-visual__rastro home-visual__rastro--2" aria-hidden="true" />
        <div className="home-visual__quadro">
          {FOTOS.map((src, i) => (
            <img
              key={src}
              className={`home-visual__foto${i === atual ? ' is-ativa' : ''}`}
              src={src}
              alt=""
              aria-hidden={i !== atual}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      </div>
      <div className="home-visual__controles">
        <span className="home-visual__contador" aria-live="polite">
          {doisDigitos(atual + 1)} <span aria-hidden="true">/</span> {doisDigitos(FOTOS.length)}
        </span>
        <button
          type="button"
          className="home-visual__seta"
          aria-label="Pausar troca automática de fotos"
          aria-pressed={pausadoManual}
          onClick={() => setPausadoManual((v) => !v)}
        >
          {pausadoManual ? <IconeTocar /> : <IconePausar />}
        </button>
        <button type="button" className="home-visual__seta" aria-label="Foto anterior" onClick={() => ir(-1)}>
          <Seta direcao="esquerda" />
        </button>
        <button type="button" className="home-visual__seta" aria-label="Próxima foto" onClick={() => ir(1)}>
          <Seta />
        </button>
      </div>
    </aside>
  );
}

type Props = {
  children: ReactNode;
  tituloId: string;
  voltar?: boolean;
};

export function LayoutEntrada({ children, tituloId, voltar = false }: Props) {
  return (
    <main id="conteudo" className="home-shell" tabIndex={-1}>
      <div className="home-tela">
        <LinhasVelocidade />
        <div className="home-identidade">
          <div className="home-marca">
            <BrandMark />
          </div>
          <span className="home-identidade__lab">Laboratório de Solos</span>
          {voltar && (
            <Link to="/" className="home-identidade__voltar">
              <Seta direcao="esquerda" />
              Início
            </Link>
          )}
          <Footer />
        </div>

        <section className="home-conteudo" aria-labelledby={tituloId}>
          {children}

          <div className="home-rodape-movel">
            <Footer />
          </div>
        </section>

        <Carrossel />
      </div>
    </main>
  );
}
