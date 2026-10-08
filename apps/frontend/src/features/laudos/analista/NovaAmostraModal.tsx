import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { MensagemErroCampo } from '@/components/ui/MensagemErroCampo';
import { Button } from '@/components/ui/Button';
import { gerarIdentificacaoTeste } from './dadosTeste';
import { calcularPrevisaoEntrega, formatarData } from './statusAmostra';
import { ROTULOS_TIPO_ANALISE, type Identificacao, type TipoAnalise } from './tipos';
import './analista.css';
import './NovaAmostraModal.css';

type CampoValidado =
  | 'protocolo'
  | 'cpfCliente'
  | 'solicitante'
  | 'dataRecebimento'
  | 'tipoAnalise'
  | 'propriedade'
  | 'culturaExistente'
  | 'email'
  | 'telefone';

type ErrosCampos = Partial<Record<CampoValidado, string>>;

const OPCOES_TIPO_ANALISE = (Object.keys(ROTULOS_TIPO_ANALISE) as TipoAnalise[]).map((tipo) => ({
  valor: tipo,
  rotulo: ROTULOS_TIPO_ANALISE[tipo],
}));

/** Validação feita no front, com mensagens próprias em cada campo (sem o balão nativo do navegador). */
function validar(identificacao: Identificacao): ErrosCampos {
  const erros: ErrosCampos = {};
  const obrigatorio = 'Preencha este campo para continuar.';
  if (!identificacao.protocolo.trim()) erros.protocolo = obrigatorio;
  const cpf = (identificacao.cpfCliente ?? '').replace(/\D/g, '');
  if (!cpf) erros.cpfCliente = obrigatorio;
  else if (cpf.length !== 11) erros.cpfCliente = 'O CPF precisa ter 11 dígitos.';
  if (!identificacao.solicitante.trim()) erros.solicitante = obrigatorio;
  if (!identificacao.dataRecebimento) erros.dataRecebimento = 'Informe a data em que a amostra chegou.';
  if (!identificacao.tipoAnalise) erros.tipoAnalise = 'Escolha o tipo da análise.';
  if (!identificacao.propriedade.trim()) erros.propriedade = obrigatorio;
  if (!identificacao.culturaExistente.trim()) erros.culturaExistente = obrigatorio;
  if (identificacao.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identificacao.email)) {
    erros.email = 'Confira o e-mail (ex.: nome@exemplo.com).';
  }
  const telefone = identificacao.telefone.replace(/\D/g, '');
  if (telefone && telefone.length < 10) erros.telefone = 'Informe o DDD e o número completo.';
  return erros;
}

const ID_POR_CAMPO: Record<CampoValidado, string> = {
  protocolo: 'protocolo',
  cpfCliente: 'cpf',
  solicitante: 'solicitante',
  dataRecebimento: 'recebimento',
  tipoAnalise: 'tipo-analise',
  propriedade: 'propriedade',
  culturaExistente: 'cultura-existente',
  email: 'email',
  telefone: 'telefone',
};

interface NovaAmostraModalProps {
  isOpen: boolean;
  identificacao: Identificacao;
  onChange: (identificacao: Identificacao) => void;
  onClose: () => void;
  onCriar: () => void;
  erro?: string | null;
  carregando?: boolean;
}

export function NovaAmostraModal({
  isOpen,
  identificacao,
  onChange,
  onClose,
  onCriar,
  erro = null,
  carregando = false,
}: NovaAmostraModalProps) {
  const [erros, setErros] = useState<ErrosCampos>({});

  useEffect(() => {
    if (isOpen) setErros({});
  }, [isOpen]);

  function atualizar<K extends keyof Identificacao>(campo: K, valor: Identificacao[K]) {
    onChange({ ...identificacao, [campo]: valor });
    // O erro do campo some assim que ele é corrigido
    if (campo in erros) setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function formatarCpf(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }

  function handleCpfChange(valor: string) {
    atualizar('cpfCliente', formatarCpf(valor));
  }

  function formatarTelefone(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 2) return digitos.length ? `(${digitos}` : '';
    if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  const previsaoEntrega = calcularPrevisaoEntrega(identificacao.dataRecebimento);

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = validar(identificacao);
    setErros(encontrados);
    const primeiro = Object.keys(encontrados)[0];
    if (primeiro) {
      document.getElementById(`nova-${ID_POR_CAMPO[primeiro as CampoValidado]}`)?.focus();
      return;
    }
    onCriar();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Amostra"
    >
      <form onSubmit={aoSubmeter} noValidate>
        {erro && (
          <div className="form-alert-erro" role="alert" style={{ marginTop: 0, marginBottom: 'var(--espaco-md)' }}>
            <strong>Erro no cadastro:</strong> {erro}
          </div>
        )}

        <div className="nova-amostra-grid">
          <TextField
            id="nova-protocolo"
            erro={erros.protocolo}
            label="Protocolo (Ref. do laboratório)"
            value={identificacao.protocolo}
            onChange={(v) => atualizar('protocolo', v)}
            placeholder="Ex.: LAB-2026-0150"
            required
          />
          <TextField
            id="nova-cpf"
            erro={erros.cpfCliente}
            label="CPF do Solicitante"
            value={identificacao.cpfCliente ?? ''}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            required
          />
          <TextField
            id="nova-solicitante"
            erro={erros.solicitante}
            label="Proprietário/Solicitante"
            value={identificacao.solicitante}
            onChange={(v) => atualizar('solicitante', v)}
            placeholder="Nome completo do solicitante"
            required
            className="nova-amostra-grid__largo"
          />
          <div className={`form-field ${erros.dataRecebimento ? 'form-field--invalido' : ''}`.trim()}>
            <label htmlFor="nova-recebimento">
              Recebimento da amostra
              <span className="form-field__obrigatorio" aria-hidden="true"> *</span>
            </label>
            <DatePicker
              id="nova-recebimento"
              value={identificacao.dataRecebimento}
              onChange={(data) => atualizar('dataRecebimento', data)}
              invalido={!!erros.dataRecebimento}
              ariaDescribedBy={erros.dataRecebimento ? 'nova-recebimento-erro' : undefined}
            />
            <MensagemErroCampo id="nova-recebimento-erro" mensagem={erros.dataRecebimento} />
          </div>
          <div className="form-field">
            <label htmlFor="nova-previsao">Previsão de entrega do laudo</label>
            <input
              id="nova-previsao"
              className="nova-amostra-calculado"
              value={previsaoEntrega ? formatarData(previsaoEntrega) : '—'}
              readOnly
              tabIndex={-1}
            />
          </div>
          <div className={`form-field ${erros.tipoAnalise ? 'form-field--invalido' : ''}`.trim()}>
            <label htmlFor="nova-tipo-analise">
              Tipo da análise
              <span className="form-field__obrigatorio" aria-hidden="true"> *</span>
            </label>
            <Select
              id="nova-tipo-analise"
              value={identificacao.tipoAnalise}
              opcoes={OPCOES_TIPO_ANALISE}
              onChange={(tipo) => atualizar('tipoAnalise', tipo)}
              placeholder="Selecione o tipo..."
              invalido={!!erros.tipoAnalise}
            />
            <MensagemErroCampo id="nova-tipo-analise-erro" mensagem={erros.tipoAnalise} />
          </div>
          <TextField
            id="nova-profundidade"
            label="Prof. de coleta da amostra"
            placeholder="Ex.: 0-20 cm"
            value={identificacao.profundidadeColeta}
            onChange={(v) => atualizar('profundidadeColeta', v)}
          />
          <TextField
            id="nova-propriedade"
            erro={erros.propriedade}
            label="Nome da propriedade"
            value={identificacao.propriedade}
            onChange={(v) => atualizar('propriedade', v)}
            placeholder="Ex.: Fazenda Esperança"
            required
          />
          <TextField
            id="nova-localizacao"
            label="Localização"
            placeholder="Cidade - UF"
            value={identificacao.localizacao}
            onChange={(v) => atualizar('localizacao', v)}
          />
          <TextField
            id="nova-area-identificacao"
            label="Identificação da área"
            placeholder="Ex.: Gleba B / Talhão 2"
            value={identificacao.areaIdentificacao}
            onChange={(v) => atualizar('areaIdentificacao', v)}
          />
          <TextField
            id="nova-area-hectares"
            label="Área (ha)"
            placeholder="Ex.: 15.5"
            value={identificacao.areaHectares}
            onChange={(v) => atualizar('areaHectares', v)}
          />
          <TextField
            id="nova-cultivo"
            label="Cultivo"
            placeholder="Ex.: Milho / Soja / Café"
            value={identificacao.cultivo}
            onChange={(v) => atualizar('cultivo', v)}
          />
          <TextField
            id="nova-cultura-existente"
            erro={erros.culturaExistente}
            label="Cultura existente"
            placeholder="Ex.: Pastagem / Mata nativa"
            value={identificacao.culturaExistente}
            onChange={(v) => atualizar('culturaExistente', v)}
            required
          />
        </div>

        <p className="form-subsecao-titulo">Contato (opcional)</p>
        <div className="nova-amostra-grid">
          <TextField
            id="nova-email"
            erro={erros.email}
            label="E-mail"
            type="email"
            placeholder="nome@exemplo.com"
            value={identificacao.email}
            onChange={(v) => atualizar('email', v.trim())}
          />
          <TextField
            id="nova-telefone"
            erro={erros.telefone}
            label="Telefone para contato"
            type="tel"
            placeholder="(00) 00000-0000"
            value={identificacao.telefone}
            onChange={(v) => atualizar('telefone', formatarTelefone(v))}
          />
        </div>

        <div className="form-actions">
          {import.meta.env.DEV && (
            <Button
              type="button"
              variant="ghost"
              className="nova-amostra-teste"
              onClick={() => {
                onChange(gerarIdentificacaoTeste());
                setErros({});
              }}
              disabled={carregando}
            >
              Preencher dados de teste
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={carregando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={carregando}>
            {carregando ? 'Cadastrando Amostra...' : 'Continuar para o Registro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
