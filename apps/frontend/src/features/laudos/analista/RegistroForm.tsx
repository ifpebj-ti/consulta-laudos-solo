import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { DecimalInput } from '@/components/ui/DecimalInput';
import { CalibracaoSecao } from './CalibracaoSecao';
import { calcularGranulometria, calcularValorLiquido } from './calculos';
import { DADOS_ANALISE_INICIAIS, type CampoComBranco, type DadosAnalise } from './tipos';
import './analista.css';

interface CampoComBrancoInputProps {
  idPrefix: string;
  legenda: string;
  unidade: string;
  valor: CampoComBranco;
  onChange: (proximo: CampoComBranco) => void;
}

function CampoComBrancoInput({ idPrefix, legenda, unidade, valor, onChange }: CampoComBrancoInputProps) {
  const liquido = calcularValorLiquido(valor.medido, valor.branco);
  return (
    <div className="form-field form-field--com-branco">
      <label htmlFor={`${idPrefix}-medido`}>
        {legenda} <span className="unit">{unidade}</span>
      </label>
      <div className="form-field__linha-branco">
        <div className="form-field__sub">
          <span className="form-field__sub-label">Valor medido</span>
          <DecimalInput id={`${idPrefix}-medido`} value={valor.medido} onChange={(medido) => onChange({ ...valor, medido })} />
        </div>
        <div className="form-field__sub">
          <span className="form-field__sub-label">Branco</span>
          <DecimalInput id={`${idPrefix}-branco`} value={valor.branco} onChange={(branco) => onChange({ ...valor, branco })} />
        </div>
      </div>
      <p className="form-field__liquido">
        Valor líquido: <strong>{liquido.toFixed(2)}</strong> {unidade}
      </p>
    </div>
  );
}

interface RegistroFormProps {
  dados: DadosAnalise;
  onChange: (proximo: DadosAnalise) => void;
  onProcessar: () => void;
}

export function RegistroForm({ dados, onChange, onProcessar }: RegistroFormProps) {
  const { quimica, granulometria } = dados;
  const resultadoGranulometria = calcularGranulometria(granulometria);

  function atualizarQuimica<K extends keyof typeof quimica>(campo: K, valor: (typeof quimica)[K]) {
    onChange({ ...dados, quimica: { ...quimica, [campo]: valor } });
  }

  function atualizarGranulometria<K extends keyof typeof granulometria>(campo: K, valor: number) {
    onChange({ ...dados, granulometria: { ...granulometria, [campo]: valor } });
  }

  function restaurarExemplo() {
    onChange(DADOS_ANALISE_INICIAIS);
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
      <div className="card__header">
        <div>
          <h2>Formulário de Entrada de Dados Laboratoriais</h2>
          <span className="card__subtitle">Preencha os resultados de bancada da amostra selecionada</span>
        </div>
      </div>
      <div className="card__body">
        <div className="form-section">
          <div className="form-section__title">
            <span className="dot"></span> Análise Química
          </div>

          <div className="form-grid">
            <FormField
              id="campo-ph"
              label="pH"
              unit="(H₂O / CaCl₂)"
              value={quimica.ph}
              onChange={(numero) => atualizarQuimica('ph', numero)}
            />
            <FormField
              id="campo-fosforo"
              label="Fósforo (P)"
              unit="abs. bruta"
              value={quimica.fosforoAbsBruta}
              onChange={(numero) => atualizarQuimica('fosforoAbsBruta', numero)}
            />
            <FormField
              id="campo-sodio"
              label="Sódio (Na)"
              unit="mg/L"
              value={quimica.sodioMgL}
              onChange={(numero) => atualizarQuimica('sodioMgL', numero)}
            />
            <FormField
              id="campo-potassio"
              label="Potássio (K)"
              unit="mg/L"
              value={quimica.potassioMgL}
              onChange={(numero) => atualizarQuimica('potassioMgL', numero)}
            />
          </div>

          <div className="form-grid form-grid--branco" style={{ marginTop: 'var(--espaco-lg)' }}>
            <CampoComBrancoInput
              idPrefix="campo-ca"
              legenda="Cálcio (Ca)"
              unidade="cmolc/dm³"
              valor={quimica.calcio}
              onChange={(v) => atualizarQuimica('calcio', v)}
            />
            <CampoComBrancoInput
              idPrefix="campo-mg"
              legenda="Magnésio (Mg)"
              unidade="cmolc/dm³"
              valor={quimica.magnesio}
              onChange={(v) => atualizarQuimica('magnesio', v)}
            />
            <CampoComBrancoInput
              idPrefix="campo-al"
              legenda="Alumínio (Al)"
              unidade="cmolc/dm³"
              valor={quimica.aluminio}
              onChange={(v) => atualizarQuimica('aluminio', v)}
            />
            <CampoComBrancoInput
              idPrefix="campo-h-al"
              legenda="Acidez Potencial (H+Al)"
              unidade="cmolc/dm³"
              valor={quimica.acidezPotencial}
              onChange={(v) => atualizarQuimica('acidezPotencial', v)}
            />
          </div>
        </div>

        <CalibracaoSecao
          calibracaoAplicada={dados.calibracao}
          onAplicar={(coef) => onChange({ ...dados, calibracao: coef })}
        />

        <div className="form-section form-section--fisica">
          <div className="form-section__title">
            <span className="dot"></span> Análise Física (Granulometria)
          </div>

          <div className="form-grid" style={{ marginBottom: 'var(--espaco-md)' }}>
            <FormField
              id="campo-tfsa"
              label="Peso da amostra (TFSA)"
              unit="g"
              value={granulometria.tfsa}
              onChange={(numero) => atualizarGranulometria('tfsa', numero)}
            />
          </div>

          <p className="form-subsecao-titulo">Cálculos da Fração Areia, Silte e Argila</p>
          <div className="form-grid form-grid--granulometria">
            <div className="form-field form-field--com-branco">
              <label>Fração Areia</label>
              <div className="form-field__sub">
                <span className="form-field__sub-label">Peso seco areia + becker (g)</span>
                <DecimalInput
                  value={granulometria.areiaBecker}
                  onChange={(numero) => atualizarGranulometria('areiaBecker', numero)}
                />
              </div>
              <div className="form-field__sub" style={{ marginTop: 8 }}>
                <span className="form-field__sub-label">Peso seco becker (g)</span>
                <DecimalInput
                  value={granulometria.areiaBeckerVazio}
                  onChange={(numero) => atualizarGranulometria('areiaBeckerVazio', numero)}
                />
              </div>
              <p className="form-field__liquido">
                Peso areia: <strong>{resultadoGranulometria.pesoAreia.toFixed(4)}</strong> g
              </p>
            </div>

            <div className="form-field form-field--com-branco">
              <label>Fração Argila</label>
              <div className="form-field__sub">
                <span className="form-field__sub-label">Peso seco argila + becker (g)</span>
                <DecimalInput
                  value={granulometria.argilaBecker}
                  onChange={(numero) => atualizarGranulometria('argilaBecker', numero)}
                />
              </div>
              <div className="form-field__sub" style={{ marginTop: 8 }}>
                <span className="form-field__sub-label">Peso seco becker (g)</span>
                <DecimalInput
                  value={granulometria.argilaBeckerVazio}
                  onChange={(numero) => atualizarGranulometria('argilaBeckerVazio', numero)}
                />
              </div>
              <p className="form-field__liquido">
                Argila em 10 ml (corrigida): <strong>{resultadoGranulometria.argila10mlCorrigido.toFixed(4)}</strong> g
                <br />
                Argila em 1000 ml: <strong>{resultadoGranulometria.argila1000ml.toFixed(2)}</strong> g
              </p>
            </div>

            <div className="form-field form-field--com-branco">
              <label>Branco do Dispersante (NaOH)</label>
              <div className="form-field__sub">
                <span className="form-field__sub-label">Peso seco NaOH + becker (g)</span>
                <DecimalInput
                  value={granulometria.naohBecker}
                  onChange={(numero) => atualizarGranulometria('naohBecker', numero)}
                />
              </div>
              <div className="form-field__sub" style={{ marginTop: 8 }}>
                <span className="form-field__sub-label">Peso seco becker (g)</span>
                <DecimalInput
                  value={granulometria.naohBeckerVazio}
                  onChange={(numero) => atualizarGranulometria('naohBeckerVazio', numero)}
                />
              </div>
              <p className="form-field__liquido">
                Peso seco do NaOH: <strong>{resultadoGranulometria.pesoSecoNaoh.toFixed(4)}</strong> g
              </p>
            </div>
          </div>

          <div className="calib-summary" style={{ marginTop: 'var(--espaco-md)' }}>
            <div className="calib-summary__item">
              <span>% Areia</span>
              <strong>{resultadoGranulometria.pctAreia !== null ? `${Math.round(resultadoGranulometria.pctAreia)}%` : '—'}</strong>
            </div>
            <div className="calib-summary__item">
              <span>% Silte</span>
              <strong>{resultadoGranulometria.pctSilte !== null ? `${Math.round(resultadoGranulometria.pctSilte)}%` : '—'}</strong>
            </div>
            <div className="calib-summary__item">
              <span>% Argila</span>
              <strong>{resultadoGranulometria.pctArgila !== null ? `${Math.round(resultadoGranulometria.pctArgila)}%` : '—'}</strong>
            </div>
          </div>

          <p className="form-field--help" style={{ marginTop: 8 }}>
            Silte calculado automaticamente por diferença. Informe o peso da amostra (TFSA) para habilitar os
            percentuais.
          </p>
        </div>

        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={restaurarExemplo}>
            Restaurar Exemplo
          </Button>
          <Button type="submit">Salvar e Processar Cálculos</Button>
        </div>
      </div>
    </form>
  );
}
