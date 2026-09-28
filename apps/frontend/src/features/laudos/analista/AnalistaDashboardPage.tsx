import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useAnalista } from '@/context/AnalistaContext';
import { analiseService } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { NovaAmostraModal } from './NovaAmostraModal';
import { formatarData, rotuloStatus, urgenciaPrazo, variantStatus } from './statusAmostra';
import { IDENTIFICACAO_VAZIA, type AmostraRegistro, type CartaoAmostra, type Identificacao } from './tipos';
import './AnalistaDashboardPage.css';

function calcularPrazo15Dias(): string {
  const data = new Date();
  data.setDate(data.getDate() + 15);
  return data.toISOString().slice(0, 10);
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="dashboard-vazio">
      <p>{mensagem}</p>
    </div>
  );
}

function paraCartao(amostra: AmostraRegistro): CartaoAmostra {
  const { identificacao } = amostra.dados;
  return {
    protocolo: identificacao.protocolo,
    solicitante: identificacao.solicitante,
    propriedade: identificacao.propriedade,
    prazo: identificacao.prazo,
    status: amostra.status,
  };
}

function CartaoBloco({
  cartao,
  mostrarPrazo,
  onAbrir,
}: {
  cartao: CartaoAmostra;
  mostrarPrazo: boolean;
  onAbrir?: () => void;
}) {
  const urgencia = mostrarPrazo ? urgenciaPrazo(cartao.prazo) : null;
  const clicavel = !!onAbrir;

  return (
    <div
      className={`dashboard-bloco ${clicavel ? 'dashboard-bloco--clicavel' : ''}`}
      onClick={clicavel ? onAbrir : undefined}
      role={clicavel ? 'button' : undefined}
      tabIndex={clicavel ? 0 : undefined}
    >
      <div className="dashboard-bloco__topo">
        <strong>{cartao.protocolo || 'Sem protocolo'}</strong>
      </div>
      <p className="dashboard-bloco__solicitante">{cartao.solicitante || 'Solicitante não informado'}</p>
      {cartao.propriedade && <p className="dashboard-bloco__propriedade">{cartao.propriedade}</p>}

      <div className="dashboard-bloco__badges">
        <Badge variant={variantStatus(cartao.status)}>{rotuloStatus(cartao.status)}</Badge>
        {urgencia && <Badge variant={urgencia.variant}>{urgencia.rotulo}</Badge>}
      </div>

      {mostrarPrazo && (
        <p className="dashboard-bloco__prazo">
          Prazo: <strong>{formatarData(cartao.prazo)}</strong>
        </p>
      )}
    </div>
  );
}

export function AnalistaDashboardPage() {
  const { session } = useAuth();
  const token = session?.token;
  const { amostras, criarAmostra, retomarAmostra } = useAnalista();
  const navigate = useNavigate();

  const [modalAberto, setModalAberto] = useState(false);
  const [identificacaoModal, setIdentificacaoModal] = useState<Identificacao>(IDENTIFICACAO_VAZIA);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [salvandoModal, setSalvandoModal] = useState(false);

  const cartoes = amostras.map(paraCartao);

  const pendentes = cartoes
    .filter((c) => c.status !== 'concluido')
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
  const concluidas = cartoes.filter((c) => c.status === 'concluido');

  function abrirModalNovaAmostra() {
    setIdentificacaoModal(IDENTIFICACAO_VAZIA);
    setErroModal(null);
    setModalAberto(true);
  }

  async function aoCriarAmostra() {
    setErroModal(null);

    // Validação preventiva do CPF
    const cpfLimpo = (identificacaoModal.cpfCliente ?? '').replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroModal('O CPF do cliente é obrigatório e deve ter 11 dígitos.');
      return;
    }

    if (!token) {
      setErroModal('Sessão expirada. Por favor, realize o login novamente.');
      return;
    }

    setSalvandoModal(true);
    try {
      await analiseService.criarAmostra(
        {
          protocolo: identificacaoModal.protocolo.trim(),
          cpf_cliente: cpfLimpo,
          cliente_nome: identificacaoModal.solicitante.trim(),
          propriedade: identificacaoModal.propriedade.trim(),
          localizacao: identificacaoModal.localizacao?.trim(),
          areaIdentificacao: identificacaoModal.areaIdentificacao?.trim(),
          areaHectares: identificacaoModal.areaHectares?.trim(),
          profundidadeColeta: identificacaoModal.profundidadeColeta?.trim(),
          cultivo: identificacaoModal.cultivo?.trim(),
        },
        token,
      );

      // Prazo automático de 15 dias a partir da criação
      const prazoCalculado = calcularPrazo15Dias();
      const amostraFinal: Identificacao = {
        ...identificacaoModal,
        prazo: prazoCalculado,
      };

      criarAmostra(amostraFinal);
      setModalAberto(false);
      navigate('/analista/analises');
    } catch (e) {
      if (e instanceof ApiError) {
        setErroModal(e.message);
      } else {
        setErroModal('Erro ao conectar com o servidor para cadastrar a amostra.');
      }
    } finally {
      setSalvandoModal(false);
    }
  }

  function aoAbrirAmostra(protocolo: string) {
    retomarAmostra(protocolo);
    navigate('/analista/analises');
  }

  return (
    <>
      <Navbar titulo="Módulo do Analista" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <span className="page-header__eyebrow">Laboratório de Solos &middot; Uso interno</span>
            <h1>Painel do Analista</h1>
            <p>Acompanhe prazos, histórico de laudos e inicie novas análises.</p>
          </div>
        </div>

        <Card className="dashboard-cta">
          <CardBody>
            <div className="dashboard-cta__conteudo">
              <div>
                <h2>Registrar Nova Análise</h2>
                <p>Cadastre o protocolo, o prazo e os dados da amostra antes de iniciar o registro da análise.</p>
              </div>
              <Button onClick={abrirModalNovaAmostra}>Registrar Nova Análise</Button>
            </div>
          </CardBody>
        </Card>

        <Card className="dashboard-secao">
          <CardHeader title="Prazos para Entregar Laudos" subtitle="Amostras ainda não concluídas, ordenadas pelo prazo mais próximo" />
          <CardBody>
            {pendentes.length === 0 ? (
              <EstadoVazio mensagem="Nenhum laudo pendente no momento. Clique em “Registrar Nova Análise” para começar." />
            ) : (
              <div className="dashboard-grade-blocos">
                {pendentes.map((cartao) => (
                  <CartaoBloco
                    key={cartao.protocolo}
                    cartao={cartao}
                    mostrarPrazo
                    onAbrir={() => aoAbrirAmostra(cartao.protocolo)}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="dashboard-secao">
          <CardHeader title="Histórico de Laudos" subtitle="Laudos já homologados nesta sessão" />
          <CardBody>
            {concluidas.length === 0 ? (
              <EstadoVazio mensagem="Nenhum laudo homologado ainda." />
            ) : (
              <div className="dashboard-grade-blocos">
                {concluidas.map((cartao) => (
                  <CartaoBloco key={cartao.protocolo} cartao={cartao} mostrarPrazo={false} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </main>
      <Footer />

      <NovaAmostraModal
        isOpen={modalAberto}
        identificacao={identificacaoModal}
        onChange={setIdentificacaoModal}
        onClose={() => setModalAberto(false)}
        onCriar={aoCriarAmostra}
        erro={erroModal}
        carregando={salvandoModal}
      />
    </>
  );
}
