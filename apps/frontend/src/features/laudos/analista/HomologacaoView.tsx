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
import { formatarData, hojeIso } from './statusAmostra';
import { ROTULOS_TIPO_ANALISE, type DadosAnalise } from './tipos';
import './HomologacaoView.css';

interface HomologacaoViewProps {
  dados: DadosAnalise;
  /** Laudo já homologado: apenas visualização, sem opção de editar ou liberar de novo. */
  jaLiberado?: boolean;
  onVoltarParaEdicao: () => void;
  onLiberarLaudo: () => void;
}

export function HomologacaoView({ dados, jaLiberado = false, onVoltarParaEdicao, onLiberarLaudo }: HomologacaoViewProps) {
  const [liberado, setLiberado] = useState(jaLiberado);
  const { identificacao, quimica, granulometria, calibracao } = dados;
  const temContato = Boolean(identificacao.email || identificacao.telefone);

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
            <strong>{identificacao.protocolo || '—'}</strong>
          </div>
        </div>

        <div className="laudo-doc__grid-info">
          {/* Sem contato informado, o solicitante ocupa o espaço do bloco de contato. */}
          <div className={`info-box ${temContato ? '' : 'info-box--largo'}`.trim()}>
            <span>Proprietário/Solicitante</span>
            <strong>{identificacao.solicitante || '—'}</strong>
          </div>
          {temContato && (
            <div className="info-box info-box--contato">
              <span>Contato</span>
              {identificacao.email && <strong>{identificacao.email}</strong>}
              {identificacao.telefone && <strong>{identificacao.telefone}</strong>}
            </div>
          )}
          <div className="info-box">
            <span>Ref. do Laboratório</span>
            <strong>{identificacao.protocolo || '—'}</strong>
          </div>
          <div className="info-box">
            <span>Tipo da Análise</span>
            <strong>{identificacao.tipoAnalise ? ROTULOS_TIPO_ANALISE[identificacao.tipoAnalise] : '—'}</strong>
          </div>
          <div className="info-box">
            <span>Nome e Localização da Propriedade</span>
            <strong>
              {identificacao.propriedade || '—'}
              {identificacao.localizacao ? ` · ${identificacao.localizacao}` : ''}
            </strong>
          </div>
          <div className="info-box">
            <span>Identificação da Área</span>
            <strong>{identificacao.areaIdentificacao || '—'}</strong>
          </div>
          <div className="info-box">
            <span>Área (ha)</span>
            <strong>{identificacao.areaHectares || '—'}</strong>
          </div>
          <div className="info-box">
            <span>Prof. de Coleta da Amostra</span>
            <strong>{identificacao.profundidadeColeta || '—'}</strong>
          </div>
          <div className="info-box">
            <span>Recebimento da Amostra</span>
            <strong>{formatarData(identificacao.dataRecebimento)}</strong>
          </div>
          <div className="info-box">
            <span>Data de Emissão</span>
            <strong>{formatarData(identificacao.dataEmissao || hojeIso())}</strong>
          </div>
          <div className="info-box">
            <span>Cultivo</span>
            <strong>{identificacao.cultivo || '—'}</strong>
          </div>
          <div className="info-box">
            <span>Cultura Existente</span>
            <strong>{identificacao.culturaExistente || '—'}</strong>
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
        </div>

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
        {!jaLiberado && (
          <Button variant="ghost" lg onClick={onVoltarParaEdicao}>
            Voltar para Edição
          </Button>
        )}
        <Button
          variant="danger"
          lg
          onClick={() => {
            setLiberado(true);
            onLiberarLaudo();
          }}
          disabled={liberado}
        >
          {liberado ? 'Laudo Liberado' : 'Assinar Digitalmente e Liberar Laudo'}
        </Button>
      </div>
    </div>
  );
}
