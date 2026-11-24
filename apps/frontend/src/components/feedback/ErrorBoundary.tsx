import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EstadoTela } from './EstadoTela';
import { SetaVelocidade } from '@/features/home/LayoutEntrada';
import { montarTitulo } from '@/hooks/useTituloPagina';

interface Props {
  children: ReactNode;
  chaveReinicio?: string;
}

interface State {
  erro: Error | null;
}

function ehFalhaDeCarregamentoDeModulo(erro: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(erro.message);
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    document.title = montarTitulo('Erro inesperado');
    if (import.meta.env.DEV) console.error(erro, info.componentStack);
  }

  componentDidUpdate(anterior: Props): void {
    if (this.state.erro && anterior.chaveReinicio !== this.props.chaveReinicio) {
      this.setState({ erro: null });
    }
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const falhaModulo = ehFalhaDeCarregamentoDeModulo(erro);
    const semConexao = falhaModulo && typeof navigator !== 'undefined' && navigator.onLine === false;
    const textos = semConexao
      ? {
          codigo: 'Sem conexão',
          titulo: 'Sem',
          destaque: 'internet',
          descricao: 'Não foi possível carregar esta tela porque você está sem conexão. Conecte-se e recarregue a página.',
        }
      : falhaModulo
        ? {
            codigo: 'Atualização disponível',
            titulo: 'Nova versão',
            destaque: 'do sistema',
            descricao: 'O sistema foi atualizado enquanto você navegava. Recarregue a página para continuar.',
          }
        : {
            codigo: 'Erro inesperado',
            titulo: 'Algo deu',
            destaque: 'errado',
            descricao: 'Não foi possível exibir esta tela. Recarregue a página; se o problema continuar, procure o laboratório.',
          };

    return (
      <EstadoTela
        codigo={textos.codigo}
        titulo={textos.titulo}
        destaque={textos.destaque}
        descricao={textos.descricao}
        acoes={
          <>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Recarregar página
              <SetaVelocidade />
            </button>
            <a href="/" className="btn btn--ghost">
              Ir para o início
            </a>
          </>
        }
      />
    );
  }
}
