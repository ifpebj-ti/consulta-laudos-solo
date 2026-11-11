import { useEffect, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { Button } from '@/components/ui/Button';
import { DecimalInput } from '@/components/ui/DecimalInput';
import { SetaVelocidade } from '@/features/home/LayoutEntrada';
import { CalibracaoSecao } from './CalibracaoSecao';
import { avaliarDadosAnalise } from './validacaoAnalise';
import '@/components/feedback/Feedback.css';
import {
  calcularAcidezPotencial,
  calcularGranulometria,
  calcularValorLiquido,
  classificarTextura,
  converterKParaCmolc,
  converterNaParaCmolc,
  FATOR_K_MG_L_PARA_CMOLC,
  FATOR_NA_MG_L_PARA_CMOLC,
  FATOR_NAOH_PADRAO,
  fatorNaohValido,
} from './calculos';
import type { DadosAnalise } from './tipos';
import './analista.css';

interface Subcampo {
  id: string;
  rotulo: string;
  valor: number;
  onChange: (numero: number) => void;
  invalido?: boolean;
  idErro?: string;
}

function CampoElemento({
  legenda,
  unidade,
  subcampos,
  erro,
}: {
  legenda: string;
  unidade: string;
  subcampos: Subcampo[];
  erro?: { id: string; mensagem?: string };
}) {
  return (
    <fieldset className={`form-field form-field--com-branco campo-elemento ${erro?.mensagem ? 'form-field--invalido' : ''}`.trim()}>
      <legend className="campo-elemento__legenda">
        {legenda} <span className="unit">{unidade}</span>
      </legend>
      <div className={`campo-elemento__subcampos campo-elemento__subcampos--${subcampos.length}`}>
        {subcampos.map((sub) => (
          <div className="form-field__sub" key={sub.id}>
            <label className="form-field__sub-label" htmlFor={sub.id}>
              {sub.rotulo}
            </label>
            <DecimalInput
              id={sub.id}
              value={sub.valor}
              onChange={sub.onChange}
              aria-invalid={sub.invalido || undefined}
              aria-describedby={sub.invalido ? sub.idErro : undefined}
            />
          </div>
        ))}
      </div>
      {erro && <MensagemErroCampo id={erro.id} mensagem={erro.mensagem} />}
    </fieldset>
  );
}

const formatarResultado = (valor: number) => valor.toFixed(2);

const formatarPercentual = (valor: number | null) => (valor === null ? '—' : `${Math.round(valor)}%`);
export type CampoObrigatorioRegistro = 'tfsa' | 'calibracao';
export type ErrosCamposRegistro = Partial<Record<CampoObrigatorioRegistro, string>>;

const ALVO_POR_CAMPO: Record<CampoObrigatorioRegistro, string> = {
  calibracao: 'secao-calibracao',
  tfsa: 'bloco-tfsa',
};
const ORDEM_CAMPOS: CampoObrigatorioRegistro[] = ['calibracao', 'tfsa'];

export interface RegistroFormProps {
  dados: DadosAnalise;
  onChange: (proximo: DadosAnalise) => void;
  onProcessar: () => void;
  processando?: boolean;
  statusSalvamento?: 'salvo' | 'salvando' | 'erro' | 'conflito' | 'idle';
  horarioSalvo?: string | null;
  errosProcessamento?: string[] | null;
  errosCampos?: ErrosCamposRegistro;
  tentativaValidacao?: number;
  onRecarregar?: () => void;
  onTentarSalvar?: () => void;
}

export function RegistroForm({
  dados,
  onChange,
  onProcessar,
  processando = false,
  statusSalvamento = 'idle',
  horarioSalvo = null,
  errosProcessamento = null,
  errosCampos = {},
  tentativaValidacao = 0,
  onRecarregar,
  onTentarSalvar,
}: RegistroFormProps) {
  const errosCamposRef = useRef(errosCampos);
  errosCamposRef.current = errosCampos;

  useEffect(() => {
    if (tentativaValidacao === 0) return;
    const pendentes = ORDEM_CAMPOS.filter((campo) => errosCamposRef.current[campo]);
    if (pendentes.length === 0) return;

    const alvos = pendentes
      .map((campo) => document.getElementById(ALVO_POR_CAMPO[campo]))
      .filter((el): el is HTMLElement => el !== null);
    const primeiro = alvos[0];
    if (!primeiro) return;

    const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    primeiro.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'center' });

    alvos.forEach((el) => {
      el.classList.remove('campo-alerta');
      void el.offsetWidth;
      el.classList.add('campo-alerta');
    });
    const aoTerminar = (evento: AnimationEvent) => {
      if (evento.animationName !== 'campo-alerta-pulso') return;
      const el = evento.currentTarget as HTMLElement;
      el.classList.remove('campo-alerta');
      el.removeEventListener('animationend', aoTerminar);
    };
    alvos.forEach((el) => el.addEventListener('animationend', aoTerminar));

    const temporizador = window.setTimeout(() => {
      (primeiro.querySelector<HTMLElement>('[data-foco-validacao]') ?? primeiro.querySelector<HTMLElement>('input, button'))?.focus({
        preventScroll: true,
      });
    }, reduzirMovimento ? 0 : 450);
    return () => window.clearTimeout(temporizador);
  }, [tentativaValidacao]);

  const { quimica, granulometria } = dados;
  const resultadoGranulometria = calcularGranulometria(granulometria);
  const { pctAreia, pctSilte, pctArgila } = resultadoGranulometria;
  const classeTextural =
    pctAreia !== null && pctSilte !== null && pctArgila !== null ? classificarTextura(pctAreia, pctSilte, pctArgila) : null;

  const fatorInvalido = !fatorNaohValido(quimica.acidezPotencial.fator);
  const avisos = avaliarDadosAnalise(dados);
  const resultadosComplexo = [
    { sigla: 'Ca²⁺', valor: formatarResultado(calcularValorLiquido(quimica.calcio.medido, quimica.calcio.branco)) },
    { sigla: 'Mg²⁺', valor: formatarResultado(calcularValorLiquido(quimica.magnesio.medido, quimica.magnesio.branco)) },
    { sigla: 'Na⁺', valor: formatarResultado(converterNaParaCmolc(quimica.sodioMgL)) },
    { sigla: 'K⁺', valor: formatarResultado(converterKParaCmolc(quimica.potassioMgL)) },
    { sigla: 'Al³⁺', valor: formatarResultado(calcularValorLiquido(quimica.aluminio.medido, quimica.aluminio.branco)) },
    {
      sigla: 'H⁺+Al³⁺',
      valor: formatarResultado(
        calcularAcidezPotencial(quimica.acidezPotencial.medido, quimica.acidezPotencial.branco, quimica.acidezPotencial.fator),
      ),
    },
  ];
  function atualizarQuimica<K extends keyof typeof quimica>(campo: K, valor: (typeof quimica)[K]) {
    onChange({ ...dados, quimica: { ...quimica, [campo]: valor } });
  }

  function atualizarGranulometria<K extends keyof typeof granulometria>(campo: K, valor: number) {
    onChange({ ...dados, granulometria: { ...granulometria, [campo]: valor } });
  }

  return (
    <form
      className="card"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onProcessar();
      }}
    >
      <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>Formulário de Entrada de Dados Laboratoriais</h2>
        </div>
        <div>
          {statusSalvamento === 'salvando' && (
            <div className="auto-save-status auto-save-status--salvando">
              <span className="auto-save-spinner" />
              <span>Salvando rascunho...</span>
            </div>
          )}
          {statusSalvamento === 'salvo' && (
            <div className="auto-save-status auto-save-status--salvo">
              <span>✓ Rascunho salvo {horarioSalvo ? `às ${horarioSalvo}` : ''}</span>
            </div>
          )}
          {statusSalvamento === 'conflito' && (
            <div className="auto-save-status auto-save-status--conflito">
              <span>⚠ Conflito de versão</span>
            </div>
          )}
          {statusSalvamento === 'erro' && (
            <div className="auto-save-status auto-save-status--erro" role="alert">
              <span>
                {typeof navigator !== 'undefined' && navigator.onLine === false
                  ? 'Sem conexão: o rascunho será enviado quando a internet voltar'
                  : 'Falha no salvamento do rascunho'}
              </span>
              {onTentarSalvar && (
                <button type="button" className="link-acao" onClick={onTentarSalvar}>
                  Tentar salvar novamente
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="card__body">
        {statusSalvamento === 'conflito' && (
          <div className="form-alert-conflito" role="alert">
            <div>
              <strong>Conflito de edição detectado!</strong> A análise foi atualizada em outra aba ou por outro analista.
            </div>
            {onRecarregar && (
              <button type="button" className="btn-recarregar-conflito" onClick={onRecarregar}>
                Recarregar Dados
              </button>
            )}
          </div>
        )}
        <div className="form-section">
          <div className="form-section__title">
            <span className="dot"></span> Atributos Químicos
          </div>
          <div className="form-grid form-grid--quimica-simples">
            <FormField
              id="campo-ph"
              label="pH"
              unit="(H₂O)"
              value={quimica.ph}
              onChange={(numero) => atualizarQuimica('ph', numero)}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">
            <span className="dot"></span> Complexo Sortivo
          </div>
          <div className="form-grid form-grid--complexo">
            <CampoElemento
              legenda="Cálcio (Ca²⁺)"
              unidade="cmolc/dm³"
              subcampos={[
                { id: 'campo-ca-medido', rotulo: 'Leitura', valor: quimica.calcio.medido, onChange: (medido) => atualizarQuimica('calcio', { ...quimica.calcio, medido }) },
                { id: 'campo-ca-branco', rotulo: 'Branco', valor: quimica.calcio.branco, onChange: (branco) => atualizarQuimica('calcio', { ...quimica.calcio, branco }) },
              ]}
            />
            <CampoElemento
              legenda="Magnésio (Mg²⁺)"
              unidade="cmolc/dm³"
              subcampos={[
                { id: 'campo-mg-medido', rotulo: 'Leitura', valor: quimica.magnesio.medido, onChange: (medido) => atualizarQuimica('magnesio', { ...quimica.magnesio, medido }) },
                { id: 'campo-mg-branco', rotulo: 'Branco', valor: quimica.magnesio.branco, onChange: (branco) => atualizarQuimica('magnesio', { ...quimica.magnesio, branco }) },
              ]}
            />
            <CampoElemento
              legenda="Sódio (Na⁺)"
              unidade={`mg/L ÷ ${FATOR_NA_MG_L_PARA_CMOLC}`}
              subcampos={[
                { id: 'campo-sodio', rotulo: 'Leitura do fotômetro', valor: quimica.sodioMgL, onChange: (numero) => atualizarQuimica('sodioMgL', numero) },
              ]}
            />
            <CampoElemento
              legenda="Potássio (K⁺)"
              unidade={`mg/L ÷ ${FATOR_K_MG_L_PARA_CMOLC}`}
              subcampos={[
                { id: 'campo-potassio', rotulo: 'Leitura do fotômetro', valor: quimica.potassioMgL, onChange: (numero) => atualizarQuimica('potassioMgL', numero) },
              ]}
            />
            <CampoElemento
              legenda="Alumínio (Al³⁺)"
              unidade="cmolc/dm³"
              subcampos={[
                { id: 'campo-al-medido', rotulo: 'Leitura', valor: quimica.aluminio.medido, onChange: (medido) => atualizarQuimica('aluminio', { ...quimica.aluminio, medido }) },
                { id: 'campo-al-branco', rotulo: 'Branco', valor: quimica.aluminio.branco, onChange: (branco) => atualizarQuimica('aluminio', { ...quimica.aluminio, branco }) },
              ]}
            />
            <CampoElemento
              legenda="Acidez Potencial (H⁺+Al³⁺)"
              unidade="cmolc/dm³"
              subcampos={[
                { id: 'campo-h-al-medido', rotulo: 'Leitura', valor: quimica.acidezPotencial.medido, onChange: (medido) => atualizarQuimica('acidezPotencial', { ...quimica.acidezPotencial, medido }) },
                {
                  id: 'campo-h-al-fator',
                  rotulo: 'Fator NaOH',
                  valor: quimica.acidezPotencial.fator,
                  onChange: (fator) => atualizarQuimica('acidezPotencial', { ...quimica.acidezPotencial, fator }),
                  invalido: fatorInvalido,
                  idErro: 'campo-h-al-fator-erro',
                },
                { id: 'campo-h-al-branco', rotulo: 'Branco', valor: quimica.acidezPotencial.branco, onChange: (branco) => atualizarQuimica('acidezPotencial', { ...quimica.acidezPotencial, branco }) },
              ]}
              erro={{
                id: 'campo-h-al-fator-erro',
                mensagem: fatorInvalido ? `O fator de correção do NaOH deve ser maior que zero. Usando ${FATOR_NAOH_PADRAO} no cálculo.` : undefined,
              }}
            />
          </div>

          <p className="form-subsecao-titulo">Resultados do complexo sortivo (cmolc/dm³)</p>
          <dl className="calib-summary calib-summary--complexo" aria-live="polite">
            {resultadosComplexo.map((item) => (
              <div className="calib-summary__item" key={item.sigla}>
                <dt>{item.sigla}</dt>
                <dd>{item.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          id="secao-calibracao"
          className={`registro-alvo registro-alvo--secao ${errosCampos.calibracao ? 'registro-alvo--invalido' : ''}`.trim()}
        >
          <CalibracaoSecao
            calibracaoAplicada={dados.calibracao}
            onAplicar={(coef) => onChange({ ...dados, calibracao: coef })}
            leituraAmostra={quimica.fosforoAbsBruta}
            onLeituraAmostraChange={(numero) => atualizarQuimica('fosforoAbsBruta', numero)}
          />
          <MensagemErroCampo id="secao-calibracao-erro" mensagem={errosCampos.calibracao} />
        </div>

        <div className="form-section form-section--fisica">
          <div className="form-section__title">
            <span className="dot"></span> Atributos Físicos (Granulometria)
          </div>

          <div className="form-grid form-grid--fisica">
            <div id="bloco-tfsa" className="registro-alvo">
              <CampoElemento
                legenda="Amostra (TFSA)"
                unidade="g"
                subcampos={[
                  {
                    id: 'campo-tfsa',
                    rotulo: 'Peso da amostra *',
                    valor: granulometria.tfsa,
                    onChange: (numero) => atualizarGranulometria('tfsa', numero),
                    invalido: Boolean(errosCampos.tfsa),
                    idErro: 'campo-tfsa-erro',
                  },
                ]}
                erro={{ id: 'campo-tfsa-erro', mensagem: errosCampos.tfsa }}
              />
            </div>
            <CampoElemento
              legenda="Fração areia"
              unidade="g"
              subcampos={[
                { id: 'campo-areia-becker', rotulo: 'Areia + becker', valor: granulometria.areiaBecker, onChange: (numero) => atualizarGranulometria('areiaBecker', numero) },
                { id: 'campo-areia-vazio', rotulo: 'Becker vazio', valor: granulometria.areiaBeckerVazio, onChange: (numero) => atualizarGranulometria('areiaBeckerVazio', numero) },
              ]}
            />
            <CampoElemento
              legenda="Fração argila"
              unidade="g"
              subcampos={[
                { id: 'campo-argila-becker', rotulo: 'Argila + becker', valor: granulometria.argilaBecker, onChange: (numero) => atualizarGranulometria('argilaBecker', numero) },
                { id: 'campo-argila-vazio', rotulo: 'Becker vazio', valor: granulometria.argilaBeckerVazio, onChange: (numero) => atualizarGranulometria('argilaBeckerVazio', numero) },
              ]}
            />
            <CampoElemento
              legenda="Branco do dispersante (NaOH)"
              unidade="g"
              subcampos={[
                { id: 'campo-naoh-becker', rotulo: 'NaOH + becker', valor: granulometria.naohBecker, onChange: (numero) => atualizarGranulometria('naohBecker', numero) },
                { id: 'campo-naoh-vazio', rotulo: 'Becker vazio', valor: granulometria.naohBeckerVazio, onChange: (numero) => atualizarGranulometria('naohBeckerVazio', numero) },
              ]}
            />
          </div>

          <p className="form-subsecao-titulo form-subsecao-titulo--resultados">Pesos calculados (g)</p>
          <dl className="calib-summary calib-summary--pesos" aria-live="polite">
            <div className="calib-summary__item">
              <dt>Areia</dt>
              <dd>{resultadoGranulometria.pesoAreia.toFixed(4)}</dd>
            </div>
            <div className="calib-summary__item">
              <dt>Argila em 10 ml</dt>
              <dd>{resultadoGranulometria.argila10mlCorrigido.toFixed(4)}</dd>
            </div>
            <div className="calib-summary__item">
              <dt>Argila em 1000 ml</dt>
              <dd>{resultadoGranulometria.argila1000ml.toFixed(2)}</dd>
            </div>
            <div className="calib-summary__item">
              <dt>NaOH seco</dt>
              <dd>{resultadoGranulometria.pesoSecoNaoh.toFixed(4)}</dd>
            </div>
          </dl>
          <p className="form-subsecao-titulo form-subsecao-titulo--resultados">Resultados da granulometria</p>
          <dl className="calib-summary calib-summary--fisica" aria-live="polite">
            <div className="calib-summary__item">
              <dt>Areia</dt>
              <dd>{formatarPercentual(resultadoGranulometria.pctAreia)}</dd>
            </div>
            <div className="calib-summary__item">
              <dt>Silte</dt>
              <dd>{formatarPercentual(resultadoGranulometria.pctSilte)}</dd>
            </div>
            <div className="calib-summary__item">
              <dt>Argila</dt>
              <dd>{formatarPercentual(resultadoGranulometria.pctArgila)}</dd>
            </div>
            <div className="calib-summary__item calib-summary__item--texto">
              <dt>Classe textural</dt>
              <dd>{classeTextural ?? 'A classificar'}</dd>
            </div>
          </dl>
        </div>

        {avisos.length > 0 && (
          <div className="estado-bloco estado-bloco--info registro-avisos" aria-live="polite">
            <strong className="estado-bloco__titulo">Confira antes de processar</strong>
            <ul>
              {avisos.map((aviso) => (
                <li key={aviso.id}>{aviso.mensagem}</li>
              ))}
            </ul>
          </div>
        )}

        {errosProcessamento && errosProcessamento.length > 0 && (
          <div className="form-alert-erro" role="alert">
            <strong>Não foi possível processar os cálculos:</strong>
            <ul>
              {errosProcessamento.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions">
          <Button type="submit" disabled={processando}>
            {processando ? 'Processando Cálculos...' : 'Salvar e Processar Cálculos'}
            <SetaVelocidade />
          </Button>
        </div>
      </div>
    </form>
  );
}
