import { useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FUNCIONALIDADES } from '@/config/ambiente';
import {
  calcularComplexoSortivo,
  calcularConcentracaoFosforo,
  calcularGranulometria,
  calcularAcidezPotencial,
  calcularValorLiquido,
  classificarTextura,
  converterKParaCmolc,
  converterNaParaCmolc,
} from './calculos';
import { formatarData, hojeIso } from './statusAmostra';
import { ROTULOS_TIPO_ANALISE, type DadosAnalise } from './tipos';
import './analista.css';
import './HomologacaoView.css';

export type ResultadoHomologacao = { ok: true; simulado: boolean } | { ok: false; mensagem: string };

interface HomologacaoViewProps {
  dados: DadosAnalise;
  responsavel: string;
  jaLiberado?: boolean;
  processada?: boolean;
  onVoltarParaEdicao: () => void;
  onHomologar: () => Promise<ResultadoHomologacao>;
}

export function HomologacaoView({
  dados,
  responsavel,
  jaLiberado = false,
  processada = true,
  onVoltarParaEdicao,
  onHomologar,
}: HomologacaoViewProps) {
  const [liberado, setLiberado] = useState(jaLiberado);
  const [simulado, setSimulado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [homologando, setHomologando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const indisponivel = !FUNCIONALIDADES.homologacaoServidor && !import.meta.env.DEV;
  const bloqueadaPorProcessamento = !processada && !liberado;

  async function confirmar() {
    if (homologando) return;
    setHomologando(true);
    setErro(null);
    const resultado = await onHomologar();
    setHomologando(false);
    setConfirmando(false);
    if (resultado.ok) {
      setLiberado(true);
      setSimulado(resultado.simulado);
    } else {
      setErro(resultado.mensagem);
    }
  }
  const { identificacao, quimica, granulometria, calibracao } = dados;
  const temContato = Boolean(identificacao.email || identificacao.telefone);

  const granulometriaCalc = calcularGranulometria(granulometria);
  const resultadoFosforo = calibracao ? calcularConcentracaoFosforo(quimica.fosforoAbsBruta, calibracao, 1) : null;

  const liquidoCa = calcularValorLiquido(quimica.calcio.medido, quimica.calcio.branco);
  const liquidoMg = calcularValorLiquido(quimica.magnesio.medido, quimica.magnesio.branco);
  const liquidoAl = calcularValorLiquido(quimica.aluminio.medido, quimica.aluminio.branco);
  const liquidoHAl = calcularAcidezPotencial(
    quimica.acidezPotencial.medido,
    quimica.acidezPotencial.branco,
    quimica.acidezPotencial.fator,
  );

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
            <BrandMark />
          </div>
          <div className="laudo-doc__protocolo">
            Protocolo
            <strong>{identificacao.protocolo || '—'}</strong>
          </div>
        </div>

        <div className="laudo-doc__grid-info">
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
          <p className="laudo-title">Atributos Químicos e Complexo Sortivo</p>
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
                <td>Sódio (Na)</td>
                <td className="valor">{naCmolc.toFixed(2)}</td>
                <td>cmolc/dm³</td>
              </tr>
              <tr>
                <td>Potássio (K)</td>
                <td className="valor">{kCmolc.toFixed(2)}</td>
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
            <strong>{responsavel || 'Responsável técnico'}</strong>
            Responsável técnico pela homologação
            <br />
            Laboratório de Solos &middot; IFPE Campus Belo Jardim
          </div>
          <div className="assinatura-box">Área reservada para assinatura digital/eletrônica</div>
        </div>
      </div>

      <div className="homolog-cta">
        <div aria-live="polite" className="homolog-cta__mensagens">
          {liberado ? (
            <p className="homolog-cta__aviso homolog-cta__aviso--sucesso">
              {simulado
                ? 'Laudo marcado como concluído apenas neste navegador (ambiente de desenvolvimento, sem servidor).'
                : 'Laudo homologado e liberado para o cliente.'}
            </p>
          ) : (
            <p className="homolog-cta__aviso">
              Ao homologar, o status da análise será alterado para <strong>“Concluído”</strong> e o laudo em PDF ficará
              disponível na área de consulta pública do cliente.
            </p>
          )}
          {erro && (
            <p className="form-alert-erro" role="alert">
              {erro}
            </p>
          )}
        </div>
        {!liberado && (
          <Button variant="ghost" lg onClick={onVoltarParaEdicao} disabled={homologando}>
            Voltar para Edição
          </Button>
        )}
        <Button
          variant="danger"
          lg
          onClick={() => {
            setErro(null);
            setConfirmando(true);
          }}
          disabled={liberado || homologando || indisponivel || bloqueadaPorProcessamento}
          aria-describedby={indisponivel ? 'homologacao-indisponivel' : bloqueadaPorProcessamento ? 'homologacao-nao-processada' : undefined}
        >
          {liberado ? 'Laudo Liberado' : homologando ? 'Homologando...' : 'Assinar Digitalmente e Liberar Laudo'}
        </Button>
        {bloqueadaPorProcessamento && (
          <p id="homologacao-nao-processada" className="homolog-cta__aviso">
            A análise ainda não foi processada. Volte para a edição e use "Salvar e Processar Cálculos" antes de homologar.
          </p>
        )}
        {indisponivel && (
          <p id="homologacao-indisponivel" className="homolog-cta__aviso">
            A homologação pelo servidor ainda não está habilitada neste ambiente.
          </p>
        )}
      </div>

      <Modal
        isOpen={confirmando}
        onClose={() => !homologando && setConfirmando(false)}
        title="Confirmar homologação"
        subtitle={`Protocolo ${identificacao.protocolo || '—'}`}
      >
        <p className="homolog-confirmacao__texto">
          Depois de homologado, o laudo fica disponível para o cliente e os dados de bancada não podem mais ser editados.
          Deseja continuar?
        </p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setConfirmando(false)} disabled={homologando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void confirmar()} disabled={homologando}>
            {homologando ? 'Homologando...' : 'Homologar laudo'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}