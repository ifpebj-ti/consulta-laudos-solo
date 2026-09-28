import type { FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import type { Identificacao } from './tipos';
import './analista.css';
import './NovaAmostraModal.css';

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
  function atualizar<K extends keyof Identificacao>(campo: K, valor: Identificacao[K]) {
    onChange({ ...identificacao, [campo]: valor });
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

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    onCriar();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Amostra"
      subtitle="Cadastre o protocolo e os dados da amostra. O prazo de entrega é calculado automaticamente (+15 dias)."
    >
      <form onSubmit={aoSubmeter}>
        {erro && (
          <div className="form-alert-erro" role="alert" style={{ marginTop: 0, marginBottom: 'var(--espaco-md)' }}>
            <strong>Erro no cadastro:</strong> {erro}
          </div>
        )}

        <div className="nova-amostra-grid">
          <TextField
            id="nova-protocolo"
            label="Protocolo (Ref. do laboratório)"
            value={identificacao.protocolo}
            onChange={(v) => atualizar('protocolo', v)}
            placeholder="Ex.: LAB-2026-0150"
            required
          />
          <TextField
            id="nova-cpf"
            label="CPF do Solicitante"
            value={identificacao.cpfCliente ?? ''}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            required
          />
          <TextField
            id="nova-solicitante"
            label="Proprietário/Solicitante"
            value={identificacao.solicitante}
            onChange={(v) => atualizar('solicitante', v)}
            placeholder="Nome completo do solicitante"
            required
          />
          <TextField
            id="nova-propriedade"
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
            id="nova-profundidade"
            label="Prof. de coleta da amostra"
            placeholder="Ex.: 0-20 cm"
            value={identificacao.profundidadeColeta}
            onChange={(v) => atualizar('profundidadeColeta', v)}
          />
          <TextField
            id="nova-cultivo"
            label="Cultivo"
            placeholder="Ex.: Milho / Soja / Café"
            value={identificacao.cultivo}
            onChange={(v) => atualizar('cultivo', v)}
          />
        </div>

        <div className="form-actions">
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
