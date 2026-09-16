import { useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { Button } from '@/components/ui/Button';
import {
  calcularComplexoSortivo,
  calcularConcentracaoFosforo,
  calcularGranulometria,
  calcularValorLiquido,
  classificarTextura,
  converterKParaCmolc,
  converterNaParaCmolc,
} from './calculos';
import type { DadosAnalise } from './tipos';
import './HomologacaoView.css';

interface HomologacaoViewProps {
  dados: DadosAnalise;
  onVoltarParaEdicao: () => void;
}

export function HomologacaoView({ dados, onVoltarParaEdicao }: HomologacaoViewProps) {
  const [liberado, setLiberado] = useState(false);
  const { quimica, granulometria, calibracao } = dados;

  const granulometriaCalc = calcularGranulometria(granulometria);
  const resultadoFosforo = calibracao ? calcularConcentracaoFosforo(quimica.fosforoAbsBruta, calibracao, 1) : null;

  const liquidoCa = calcularValorLiquido(quimica.calcio.medido, quimica.calcio.branco);
  const liquidoMg = calcularValorLiquido(quimica.magnesio.medido, quimica.magnesio.branco);
  const liquidoAl = calcularValorLiquido(quimica.aluminio.medido, quimica.aluminio.branco);
  const liquidoHAl = calcularValorLiquido(quimica.acidezPotencial.medido, quimica.acidezPotencial.branco);

  const naCmolc = converterNaParaCmolc(quimica.sodioMgL);
  const kCmolc = converterKParaCmolc(quimica.potassioMgL);
  const complexoSortivo = calcularComplexoSortivo({
    ca: liquidoCa,
    mg: liquidoMg,
    al: liquidoAl,
    hAl: liquidoHAl,
    naCmolc,
    kCmolc,
  });

  const classeTextural =
    granulometriaCalc.pctAreia !== null && granulometriaCalc.pctSilte !== null && granulometriaCalc.pctArgila !== null
      ? classificarTextura(granulometriaCalc.pctAreia, granulometriaCalc.pctSilte, granulometriaCalc.pctArgila)
      : null;

  const formatarRelacao = (valor: number | null) => (valor === null ? '—' : valor.toFixed(2));

  return (
    <div>
      <div className="laudo-doc">
        <div className="laudo-doc__topo">
          <div className="laudo-doc__marca">
            <BrandMark dark={false} />
          </div>
          <div className="laudo-doc__protocolo">
            Protocolo
            <strong>LAB-2026-0142</strong>
          </div>
        </div>

        <div className="laudo-doc__grid-info">
          <div className="info-box">
            <span>Solicitante</span>
            <strong>Antônio S. Lima</strong>
          </div>
          <div className="info-box">
            <span>CPF/CNPJ</span>
            <strong>•••.•••.•••-12</strong>
          </div>
          <div className="info-box">
            <span>Propriedade</span>
            <strong>Sítio Boa Vista</strong>
          </div>
          <div className="info-box">
            <span>Data da Coleta</span>
            <strong>12/08/2026</strong>
          </div>
        </div>

        <div className="laudo-table-wrap">
          <p className="laudo-title">Atributos Químicos</p>
          <table className="laudo-table">
            <thead>
              <tr>
                <th>Parâmetro</th>
                <th>Valor</th>
                <th>Unidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>pH (H₂O)</td>
                <td className="valor">{quimica.ph.toFixed(2)}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Fósforo (P)</td>
                <td className="valor">{resultadoFosforo ? resultadoFosforo.fosforo.toFixed(2) : '—'}</td>
                <td>{resultadoFosforo ? 'mg/dm³' : 'calibração pendente'}</td>
              </tr>
              <tr>
                <td>Potássio (K)</td>
                <td className="valor">{quimica.potassioMgL.toFixed(2)}</td>
                <td>mg/L</td>
              </tr>
              <tr>
                <td>Sódio (Na)</td>
                <td className="valor">{quimica.sodioMgL.toFixed(2)}</td>
                <td>mg/L</td>
              </tr>
              <tr>
                <td>Cálcio (Ca)</td>
                <td className="valor">{liquidoCa.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>Magnésio (Mg)</td>
                <td className="valor">{liquidoMg.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>Alumínio (Al)</td>
                <td className="valor">{liquidoAl.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>Acidez Potencial (H+Al)</td>
                <td className="valor">{liquidoHAl.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="laudo-table-wrap">
          <p className="laudo-title">Complexo Sortivo, CTC e Relações entre Bases</p>
          <table className="laudo-table">
            <thead>
              <tr>
                <th>Índice</th>
                <th>Sigla</th>
                <th>Valor</th>
                <th>Unidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Soma de Bases</td>
                <td>SB</td>
                <td className="valor">{complexoSortivo.somaBases.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>CTC Efetiva</td>
                <td>t</td>
                <td className="valor">{complexoSortivo.ctcEfetiva.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>CTC Potencial</td>
                <td>T</td>
                <td className="valor">{complexoSortivo.ctcPotencial.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>Saturação por Bases</td>
                <td>V%</td>
                <td className="valor">{complexoSortivo.saturacaoBases.toFixed(2)}</td>
                <td>%</td>
              </tr>
              <tr>
                <td>Saturação por Alumínio</td>
                <td>m%</td>
                <td className="valor">{complexoSortivo.saturacaoAluminio.toFixed(2)}</td>
                <td>%</td>
              </tr>
              <tr>
                <td>Relação Ca/Mg</td>
                <td>—</td>
                <td className="valor">{formatarRelacao(complexoSortivo.relacaoCaMg)}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Relação Ca/K</td>
                <td>—</td>
                <td className="valor">{formatarRelacao(complexoSortivo.relacaoCaK)}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Relação Mg/K</td>
                <td>—</td>
                <td className="valor">{formatarRelacao(complexoSortivo.relacaoMgK)}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
          <p className="laudo-doc__nota">
            Na⁺ e K⁺ convertidos de mg/L para cmolc/dm³ considerando extração Mehlich-1 (proporção solo:extrator
            1:10) — fatores 230 e 391, conforme planilha de cálculo do laboratório.
          </p>
        </div>

        <div className="laudo-table-wrap">
          <p className="laudo-title">Atributos Físicos</p>
          <table className="laudo-table">
            <thead>
              <tr>
                <th>Parâmetro</th>
                <th>Valor</th>
                <th>Unidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Areia</td>
                <td className="valor">{granulometriaCalc.pctAreia !== null ? granulometriaCalc.pctAreia.toFixed(1) : '—'}</td>
                <td>%</td>
              </tr>
              <tr>
                <td>Silte</td>
                <td className="valor">{granulometriaCalc.pctSilte !== null ? granulometriaCalc.pctSilte.toFixed(1) : '—'}</td>
                <td>%</td>
              </tr>
              <tr>
                <td>Argila</td>
                <td className="valor">{granulometriaCalc.pctArgila !== null ? granulometriaCalc.pctArgila.toFixed(1) : '—'}</td>
                <td>%</td>
              </tr>
              <tr>
                <td>Classe Textural</td>
                <td className="valor" style={{ textAlign: 'left' }}>
                  {classeTextural ?? 'A classificar'}
                </td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
          {classeTextural && (
            <p className="laudo-doc__nota">
              Classe textural calculada pelo triângulo textural de referência do laboratório.
            </p>
          )}
        </div>

        <p className="laudo-title" style={{ marginBottom: 6 }}>
          Metodologias e Referências
        </p>
        <p className="laudo-doc__referencias">
          Análises realizadas conforme metodologia Embrapa (Manual de Métodos de Análise de Solo) e recomendações do
          Boletim Técnico IAC 100. Valores de referência de interpretação de fertilidade adaptados às classes de solo
          da região.
        </p>

        <div className="laudo-doc__rodape">
          <div className="resp-tecnico">
            <strong>Prof. Msc. Carla Andrade Ferreira</strong>
            Responsável Técnica &middot; CREA-PE 123456-D
            <br />
            Laboratório de Solos &middot; IFPE Campus Belo Jardim
          </div>
          <div className="assinatura-box">Área reservada para assinatura digital/eletrônica</div>
        </div>
      </div>

      <div className="homolog-cta">
        {liberado ? (
          <p className="homolog-cta__aviso homolog-cta__aviso--sucesso">
            Laudo assinado digitalmente e liberado para o cliente.
          </p>
        ) : (
          <p className="homolog-cta__aviso">
            Ao homologar, o status da análise será alterado para <strong>“Concluído”</strong> e o laudo em PDF ficará
            disponível na área de consulta pública do cliente.
          </p>
        )}
        <Button variant="ghost" lg onClick={onVoltarParaEdicao}>
          Voltar para Edição
        </Button>
        <Button variant="danger" lg onClick={() => setLiberado(true)} disabled={liberado}>
          {liberado ? 'Laudo Liberado' : 'Assinar Digitalmente e Liberar Laudo'}
        </Button>
      </div>
    </div>
  );
}
