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
}

export function NovaAmostraModal({ isOpen, identificacao, onChange, onClose, onCriar }: NovaAmostraModalProps) {
  function atualizar<K extends keyof Identificacao>(campo: K, valor: Identificacao[K]) {
    onChange({ ...identificacao, [campo]: valor });
  }

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    onCriar();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Amostra" subtitle="Informe os dados de identificação da amostra e o prazo de entrega do laudo">
      <form onSubmit={aoSubmeter}>
        <div className="nova-amostra-grid">
          <TextField
            id="nova-protocolo"
            label="Protocolo (Ref. do laboratório)"
            value={identificacao.protocolo}
            onChange={(v) => atualizar('protocolo', v)}
            placeholder="Ex.: 26.104-2306"
            required
          />
          <TextField
            id="nova-prazo"
            label="Prazo para entrega do laudo"
            type="date"
            value={identificacao.prazo}
            onChange={(v) => atualizar('prazo', v)}
            required
          />
          <TextField
            id="nova-solicitante"
            label="Proprietário/Solicitante"
            value={identificacao.solicitante}
            onChange={(v) => atualizar('solicitante', v)}
          />
          <TextField
            id="nova-data-emissao"
            label="Data de emissão"
            type="date"
            value={identificacao.dataEmissao}
            onChange={(v) => atualizar('dataEmissao', v)}
          />
          <TextField
            id="nova-propriedade"
            label="Nome da propriedade"
            value={identificacao.propriedade}
            onChange={(v) => atualizar('propriedade', v)}
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
            placeholder="Ex.: Área 4"
            value={identificacao.areaIdentificacao}
            onChange={(v) => atualizar('areaIdentificacao', v)}
          />
          <TextField
            id="nova-area-hectares"
            label="Área (ha)"
            value={identificacao.areaHectares}
            onChange={(v) => atualizar('areaHectares', v)}
          />
          <TextField
            id="nova-profundidade"
            label="Prof. de coleta da amostra"
            placeholder="Ex.: 20-40 cm"
            value={identificacao.profundidadeColeta}
            onChange={(v) => atualizar('profundidadeColeta', v)}
          />
          <TextField
            id="nova-cultivo"
            label="Cultivo"
            value={identificacao.cultivo}
            onChange={(v) => atualizar('cultivo', v)}
          />
        </div>

        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Continuar para o Registro</Button>
        </div>
      </form>
    </Modal>
  );
}
