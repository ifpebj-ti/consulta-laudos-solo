import { Link } from 'react-router-dom';
import { EstadoTela } from '@/components/feedback/EstadoTela';
import { SetaVelocidade } from '@/features/home/LayoutEntrada';
import { useTituloPagina } from '@/hooks/useTituloPagina';

export function NaoEncontradoPage() {
  useTituloPagina('Página não encontrada');

  return (
    <EstadoTela
      codigo="Erro 404"
      titulo="Página não"
      destaque="encontrada"
      descricao="O endereço acessado não existe ou foi movido. Confira o link ou volte para o início do sistema."
      acoes={
        <Link to="/" className="btn btn--primary">
          Voltar ao início
          <SetaVelocidade />
        </Link>
      }
    />
  );
}
