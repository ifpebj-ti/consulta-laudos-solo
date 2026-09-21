import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { DecimalInput } from '@/components/ui/DecimalInput';
import {
  calcularConcentracaoFosforo,
  calcularRegressaoLinear,
  type PontoCalibracao,
  type RegressaoLinear,
} from './calculos';
import './analista.css';
import './CalibracaoSecao.css';

const PONTOS_PADRAO: PontoCalibracao[] = [
  { x: 0, y: 0.02 },
  { x: 5, y: 0.18 },
  { x: 10, y: 0.35 },
  { x: 15, y: 0.52 },
  { x: 20, y: 0.68 },
];

const SVG_LARGURA = 360;
const SVG_ALTURA = 260;
const PAD_ESQ = 54;
const PAD_DIR = 336;
const PAD_TOPO = 16;
const PAD_BASE = 210;
const N_TICKS = 5;

function qualidadeR2(r2: number): { variant: BadgeVariant; rotulo: string } {
  if (r2 >= 0.99) return { variant: 'adequado', rotulo: 'Excelente ajuste' };
  if (r2 >= 0.95) return { variant: 'medio', rotulo: 'Ajuste aceitável' };
  return { variant: 'baixo', rotulo: 'Ajuste fraco' };
}

interface CalibracaoSecaoProps {
  calibracaoAplicada: RegressaoLinear | null;
  onAplicar: (coef: RegressaoLinear) => void;
}

export function CalibracaoSecao({ calibracaoAplicada, onAplicar }: CalibracaoSecaoProps) {
  const [pontos, setPontos] = useState<PontoCalibracao[]>(PONTOS_PADRAO);
  const [leituraAmostra, setLeituraAmostra] = useState('');
  const [fatorDiluicao, setFatorDiluicao] = useState('1');

  const regressao = useMemo(() => calcularRegressaoLinear(pontos), [pontos]);

  const resultadoAmostra = useMemo(() => {
    const y = parseFloat(leituraAmostra);
    if (Number.isNaN(y)) return null;
    const fator = parseFloat(fatorDiluicao);
    return calcularConcentracaoFosforo(y, regressao, Number.isNaN(fator) ? 1 : fator);
  }, [leituraAmostra, fatorDiluicao, regressao]);

  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const xMax = Math.max(...xs, 1) * 1.08 || 1;
  const yMax = Math.max(...ys, 0.01) * 1.15 || 1;
  const escalaX = (x: number) => PAD_ESQ + (x / xMax) * (PAD_DIR - PAD_ESQ);
  const escalaY = (y: number) => PAD_BASE - (y / yMax) * (PAD_BASE - PAD_TOPO);

  const ticksX = Array.from({ length: N_TICKS + 1 }, (_, i) => (xMax / N_TICKS) * i);
  const ticksY = Array.from({ length: N_TICKS + 1 }, (_, i) => (yMax / N_TICKS) * i);
  const qualidade = qualidadeR2(regressao.r2);

  const aplicada = calibracaoAplicada !== null && calibracaoAplicada.a === regressao.a && calibracaoAplicada.b === regressao.b;

  function atualizarPonto(indice: number, campo: 'x' | 'y', numero: number) {
    setPontos((atual) => atual.map((ponto, i) => (i === indice ? { ...ponto, [campo]: numero } : ponto)));
  }

  return (
    <div className="form-section">
      <div className="form-section__title calib-secao-header">
        <span>
          <span className="dot"></span> Curva de Calibração (Fósforo)
        </span>
        <Badge variant={aplicada ? 'adequado' : 'status-processamento'}>
          {aplicada ? 'Calibração aplicada' : 'Calibração pendente'}
        </Badge>
      </div>
      <p className="calib-secao-subtitulo">Teste os 5 pontos padrão e confirme a equação y = a·x + b</p>

      <div>
        <div className="calib-secao-grid">
          <div>
            <p className="calib-secao-titulo">Pontos padrão</p>
            <table className="calib-table">
              <thead>
                <tr>
                  <th>Ponto</th>
                  <th>Concentração padrão (mg/L)</th>
                  <th>Leitura (absorbância)</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((ponto, indice) => (
                  <tr key={indice}>
                    <td>P{indice + 1}</td>
                    <td>
                      <DecimalInput
                        className="calib-input"
                        value={ponto.x}
                        onChange={(numero) => atualizarPonto(indice, 'x', numero)}
                      />
                    </td>
                    <td>
                      <DecimalInput
                        className="calib-input"
                        value={ponto.y}
                        onChange={(numero) => atualizarPonto(indice, 'y', numero)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="calib-coef-row">
              <div className="calib-coef">
                <span>Coef. A</span>
                <strong>{regressao.a.toFixed(3)}</strong>
              </div>
              <div className="calib-coef">
                <span>Coef. B</span>
                <strong>{regressao.b.toFixed(3)}</strong>
              </div>
              <div className="calib-coef">
                <span>R&sup2;</span>
                <strong>{regressao.r2.toFixed(4)}</strong>
              </div>
              <Badge variant={qualidade.variant}>{qualidade.rotulo}</Badge>
            </div>

            <Button
              type="button"
              variant="primary"
              block
              onClick={() => onAplicar(regressao)}
              disabled={aplicada}
              style={{ marginTop: 'var(--espaco-md)' }}
            >
              {aplicada ? 'Calibração já aplicada' : 'Aplicar Calibração'}
            </Button>
          </div>

          <div className="calib-grafico-wrap">
            <p className="calib-secao-titulo">Curva ajustada</p>
            <svg viewBox={`0 0 ${SVG_LARGURA} ${SVG_ALTURA}`} className="calib-svg" role="img" aria-label="Gráfico de calibração">
              {ticksY.map((tick, i) => (
                <g key={`y-${i}`}>
                  <line
                    x1={PAD_ESQ}
                    y1={escalaY(tick)}
                    x2={PAD_DIR}
                    y2={escalaY(tick)}
                    stroke="var(--cinza-200)"
                    strokeWidth={1}
                    strokeDasharray={i === 0 ? undefined : '3 3'}
                  />
                  <text x={PAD_ESQ - 8} y={escalaY(tick)} textAnchor="end" dominantBaseline="middle" className="calib-svg__tick">
                    {tick.toFixed(2)}
                  </text>
                </g>
              ))}
              {ticksX.map((tick, i) => (
                <text key={`x-${i}`} x={escalaX(tick)} y={PAD_BASE + 18} textAnchor="middle" className="calib-svg__tick">
                  {tick.toFixed(0)}
                </text>
              ))}

              <line x1={PAD_ESQ} y1={PAD_TOPO} x2={PAD_ESQ} y2={PAD_BASE} stroke="var(--cinza-500)" strokeWidth={1.5} />
              <line x1={PAD_ESQ} y1={PAD_BASE} x2={PAD_DIR} y2={PAD_BASE} stroke="var(--cinza-500)" strokeWidth={1.5} />

              <line
                x1={escalaX(0)}
                y1={escalaY(regressao.b)}
                x2={escalaX(xMax)}
                y2={escalaY(regressao.a * xMax + regressao.b)}
                stroke="var(--if-vermelho)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {pontos.map((ponto, indice) => (
                <circle key={indice} className="calib-ponto" cx={escalaX(ponto.x)} cy={escalaY(ponto.y)} r={5.5} />
              ))}

              <text x={(PAD_ESQ + PAD_DIR) / 2} y={SVG_ALTURA - 6} textAnchor="middle" className="calib-svg__eixo-titulo">
                Concentração padrão (mg/L)
              </text>
              <text
                x={14}
                y={(PAD_TOPO + PAD_BASE) / 2}
                textAnchor="middle"
                className="calib-svg__eixo-titulo"
                transform={`rotate(-90 14 ${(PAD_TOPO + PAD_BASE) / 2})`}
              >
                Absorbância
              </text>
            </svg>
          </div>
        </div>

        <div className="calib-calculadora">
          <p className="calib-calculadora__titulo">Calculadora &middot; concentração de Fósforo da amostra</p>
          <div className="calib-calculadora__linha">
            <div className="calib-calculadora__campo">
              <label htmlFor="calib-calc-y">Leitura de absorbância da amostra (y)</label>
              <input
                type="number"
                step="0.001"
                id="calib-calc-y"
                className="calib-input"
                placeholder="Ex.: 0.292"
                value={leituraAmostra}
                onChange={(e) => setLeituraAmostra(e.target.value)}
              />
            </div>
            <div className="calib-calculadora__resultado">
              <span>
                Curva <span style={{ fontWeight: 400 }}>(x &times; 10)</span>
              </span>
              <div className="calib-calculadora__valor">
                {resultadoAmostra ? resultadoAmostra.curva.toFixed(2) : regressao.a === 0 ? 'Calibração inválida (a = 0)' : '—'}
              </div>
            </div>
            <div className="calib-calculadora__campo">
              <label htmlFor="calib-calc-fator-dil">Fator de diluição</label>
              <input
                type="number"
                step="0.01"
                id="calib-calc-fator-dil"
                className="calib-input"
                value={fatorDiluicao}
                onChange={(e) => setFatorDiluicao(e.target.value)}
              />
            </div>
            <div className="calib-calculadora__resultado">
              <span>
                Fósforo (P) <span style={{ fontWeight: 400 }}>mg/dm&sup3;</span>
              </span>
              <div className="calib-calculadora__valor">{resultadoAmostra ? resultadoAmostra.fosforo.toFixed(2) : '—'}</div>
            </div>
          </div>
          <p className="calib-calculadora__aviso">
            Curva já aplica a multiplicação padrão por 10. Deixe o Fator de diluição em 1 quando não houver diluição
            adicional. Sem calibração aplicada, o laudo bloqueia o cálculo de Fósforo.
          </p>
        </div>
      </div>
    </div>
  );
}
