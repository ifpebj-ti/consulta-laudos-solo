import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import { useAnalista } from '@/context/AnalistaContext';
import { analiseService } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { LinhasVelocidade, SetaVelocidade } from '@/features/home/LayoutEntrada';
import { FaixaPaginada } from './FaixaPaginada';
import { NovaAmostraModal } from './NovaAmostraModal';
import {
  calcularPrevisaoEntrega,
  formatarData,
  hojeIso,
  rotuloStatus,
  urgenciaPrazo,
  variantStatus,
} from './statusAmostra';
import { IDENTIFICACAO_VAZIA, type AmostraRegistro, type CartaoAmostra, type Identificacao } from './tipos';
import { cpfValido, somenteDigitos } from '@/lib/documentos';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { rotaAnalise } from '@/routes/rotas';
import { FUNCIONALIDADES } from '@/config/ambiente';
import { CarregandoPagina } from '@/components/feedback/CarregandoPagina';
import { useAmostrasServidor } from './useAmostrasServidor';
import { pendenciasParaProcessar } from './validacaoAnalise';
import { formatarDataHoraServidor } from '@/lib/datas';
import '@/components/feedback/Feedback.css';
import './AnalistaDashboardPage.css';



function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function correspondeBusca(cartao: CartaoAmostra, busca: string, considerarPrazo: boolean): boolean {
  const termo = normalizar(busca);
  if (!termo) return true;
  const campos = [cartao.protocolo, cartao.solicitante, cartao.propriedade, rotuloStatus(cartao.status)];
  if (considerarPrazo) campos.push(urgenciaPrazo(cartao.prazo).rotulo);
  return campos.some((campo) => normalizar(campo ?? '').includes(termo));
}

function CampoBusca({ id, valor, onChange }: { id: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <div className="dashboard-busca">
      <svg className="dashboard-busca__icone" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10.4 10.4L14 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="text"
        placeholder="Buscar por protocolo, nome, propriedade ou status"
        aria-label="Buscar amostras"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
      {valor && (
        <button type="button" className="dashboard-busca__limpar" onClick={() => onChange('')} aria-label="Limpar busca">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

type OrdemPendentes =
  | 'prazo'
  | 'atrasados'
  | 'vence_hoje'
  | 'no_prazo'
  | 'em_andamento'
  | 'nao_iniciado'
  | 'protocolo'
  | 'solicitante';
type OrdemHistorico = 'recentes' | 'antigos' | 'protocolo' | 'solicitante';

const OPCOES_ORDEM_PENDENTES: { valor: OrdemPendentes; rotulo: string }[] = [
  { valor: 'prazo', rotulo: 'Prazo mais próximo' },
  { valor: 'atrasados', rotulo: 'Atrasados' },
  { valor: 'vence_hoje', rotulo: 'Vence hoje' },
  { valor: 'no_prazo', rotulo: 'No prazo' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'nao_iniciado', rotulo: 'Não iniciados' },
  { valor: 'protocolo', rotulo: 'Protocolo (A–Z)' },
  { valor: 'solicitante', rotulo: 'Solicitante (A–Z)' },
];

const OPCOES_ORDEM_HISTORICO: { valor: OrdemHistorico; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigos', rotulo: 'Mais antigos' },
  { valor: 'protocolo', rotulo: 'Protocolo (A–Z)' },
  { valor: 'solicitante', rotulo: 'Solicitante (A–Z)' },
];

const compararPrazo = (a: CartaoAmostra, b: CartaoAmostra) => (a.prazo || '9999').localeCompare(b.prazo || '9999');
const compararTexto = (campo: 'protocolo' | 'solicitante') => (a: CartaoAmostra, b: CartaoAmostra) =>
  a[campo].localeCompare(b[campo], 'pt-BR', { sensitivity: 'base', numeric: true });

function primeiroQuem(criterio: (cartao: CartaoAmostra) => boolean) {
  return (a: CartaoAmostra, b: CartaoAmostra) =>
    Number(criterio(b)) - Number(criterio(a)) || compararPrazo(a, b);
}

function ordenarPendentes(cartoes: CartaoAmostra[], ordem: OrdemPendentes): CartaoAmostra[] {
  const urgencia = (c: CartaoAmostra) => urgenciaPrazo(c.prazo).rotulo;
  const comparadores: Record<OrdemPendentes, (a: CartaoAmostra, b: CartaoAmostra) => number> = {
    prazo: compararPrazo,
    atrasados: primeiroQuem((c) => urgencia(c) === 'Atrasado'),
    vence_hoje: primeiroQuem((c) => urgencia(c) === 'Vence hoje'),
    no_prazo: primeiroQuem((c) => urgencia(c) === 'No prazo'),
    em_andamento: primeiroQuem((c) => c.status === 'em_andamento'),
    nao_iniciado: primeiroQuem((c) => c.status === 'nao_iniciado'),
    protocolo: compararTexto('protocolo'),
    solicitante: compararTexto('solicitante'),
  };
  return [...cartoes].sort(comparadores[ordem]);
}

function ordenarHistorico(cartoes: CartaoAmostra[], ordem: OrdemHistorico): CartaoAmostra[] {
  if (ordem === 'antigos') return cartoes;
  if (ordem === 'recentes') return [...cartoes].reverse();
  return [...cartoes].sort(compararTexto(ordem));
}

function SeletorOrdem<T extends string>({
  id,
  valor,
  opcoes,
  onChange,
}: {
  id: string;
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onChange: (valor: T) => void;
}) {
  return <Select id={id} variante="compacto" ariaLabel="Ordenar amostras" value={valor} opcoes={opcoes} onChange={onChange} />;
}

function BotaoExpandir({ expandida, onAlternar }: { expandida: boolean; onAlternar: () => void }) {
  return (
    <button type="button" className="dashboard-expandir" onClick={onAlternar} aria-expanded={expandida}>
      {expandida ? 'Retrair' : 'Expandir'}
    </button>
  );
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="dashboard-vazio">
      <p>{mensagem}</p>
    </div>
  );
}

type FiltroSituacao = 'todas' | 'nao_iniciado' | 'em_andamento' | 'aguardando_homologacao';

const SITUACOES_PENDENTES: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'nao_iniciado', rotulo: 'Não iniciadas' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'aguardando_homologacao', rotulo: 'Aguardando homologação' },
];

function paraCartao(amostra: AmostraRegistro): CartaoAmostra {
  const { identificacao } = amostra.dados;
  return {
    protocolo: identificacao.protocolo,
    solicitante: identificacao.solicitante,
    propriedade: identificacao.propriedade,
    prazo: identificacao.prazo,
    status: amostra.status,
    atualizadaEm: amostra.atualizadaEm,
    pendencias:
      amostra.status === 'em_andamento' || amostra.status === 'nao_iniciado'
        ? pendenciasParaProcessar(amostra.dados).bloqueantes
        : [],
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
      aria-label={clicavel ? `Abrir amostra ${cartao.protocolo || 'sem protocolo'}`: undefined}
      onKeyDown={
        clicavel
          ? (evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                onAbrir?.();
              }
            }
          : undefined
      }
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
      {cartao.pendencias && cartao.pendencias.length > 0 && (
        <p className="dashboard-bloco__pendencias">
          Ainda não terminou: falta {cartao.pendencias.join(', ')}.
        </p>
      )}
      {cartao.status === 'aguardando_homologacao' && (
        <p className="dashboard-bloco__pendencias dashboard-bloco__pendencias--pronto">Cálculos processados. Falta homologar.</p>
      )}
      {cartao.atualizadaEm && (
        <p className="dashboard-bloco__atualizacao">Última edição: {formatarDataHoraServidor(cartao.atualizadaEm, true)}</p>
      )}
    </div>
  );
}

export function AnalistaDashboardPage() {
  useTituloPagina('Painel do analista');
  const { session } = useAuth();
  const token = session?.token;
  const { amostras, criarAmostra, retomarAmostra } = useAnalista();
  const navigate = useNavigate();

  const [modalAberto, setModalAberto] = useState(false);
  const [identificacaoModal, setIdentificacaoModal] = useState<Identificacao>(IDENTIFICACAO_VAZIA);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [salvandoModal, setSalvandoModal] = useState(false);
  const [buscaPendentes, setBuscaPendentes] = useState('');
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [ordemPendentes, setOrdemPendentes] = useState<OrdemPendentes>('prazo');
  const [ordemHistorico, setOrdemHistorico] = useState<OrdemHistorico>('recentes');
  const [pendentesExpandido, setPendentesExpandido] = useState(false);
  const [historicoExpandido, setHistoricoExpandido] = useState(false);
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todas');
  const [recargaListagem, setRecargaListagem] = useState(0);
  const listagem = useAmostrasServidor(FUNCIONALIDADES.listagemAmostrasServidor, token, recargaListagem);

  const cartoes = listagem.tipo === 'pronto' ? listagem.cartoes : amostras.map(paraCartao);

  const pendentes = cartoes.filter((c) => c.status !== 'concluido');
  const concluidas = cartoes.filter((c) => c.status === 'concluido');

  const contagemSituacao = SITUACOES_PENDENTES.map((situacao) => ({
    ...situacao,
    total: pendentes.filter((c) => situacao.valor === 'todas' || c.status === situacao.valor).length,
  }));
  const pendentesFiltrados = ordenarPendentes(
    pendentes.filter(
      (c) => (filtroSituacao === 'todas' || c.status === filtroSituacao) && correspondeBusca(c, buscaPendentes, true),
    ),
    ordemPendentes,
  );
  const concluidasFiltradas = ordenarHistorico(
    concluidas.filter((c) => correspondeBusca(c, buscaHistorico, false)),
    ordemHistorico,
  );

  function abrirModalNovaAmostra() {
    setIdentificacaoModal({ ...IDENTIFICACAO_VAZIA, dataRecebimento: hojeIso() });
    setErroModal(null);
    setModalAberto(true);
  }

  async function aoCriarAmostra() {
    setErroModal(null);

    if (salvandoModal) return;
    const cpfLimpo = somenteDigitos(identificacaoModal.cpfCliente ?? '');
    if (!cpfValido(cpfLimpo)) {
      setErroModal('Informe um CPF válido para o solicitante.');
      return;
    }

    const prazoCalculado = calcularPrevisaoEntrega(identificacaoModal.dataRecebimento);
    if (!prazoCalculado) {
      setErroModal('Informe a data de recebimento da amostra.');
      return;
    }

    if (!identificacaoModal.tipoAnalise) {
      setErroModal('Selecione o tipo da análise.');
      return;
    }

    const telefoneLimpo = identificacaoModal.telefone.replace(/\D/g, '');
    if (telefoneLimpo && telefoneLimpo.length < 10) {
      setErroModal('O telefone deve ter DDD e 8 ou 9 dígitos.');
      return;
    }

    if (!token) {
      setErroModal('Sua sessão expirou. Entre novamente para continuar.');
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
          dataRecebimento: identificacaoModal.dataRecebimento,
          tipoAnalise: identificacaoModal.tipoAnalise,
          culturaExistente: identificacaoModal.culturaExistente.trim(),
          email: identificacaoModal.email.trim() || undefined,
          telefone: telefoneLimpo || undefined,
        },
        token,
      );

      const amostraFinal: Identificacao = {
        ...identificacaoModal,
        prazo: prazoCalculado,
      };

      criarAmostra(amostraFinal);
      setModalAberto(false);
      navigate(rotaAnalise(amostraFinal.protocolo));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErroModal(`Já existe uma amostra com o protocolo ${identificacaoModal.protocolo.trim()}. Confira o número ou use outro protocolo.`);
      } else if (e instanceof ApiError && e.erros && e.erros.length > 0) {
        setErroModal(`Confira os dados: ${e.erros.join('; ')}`);
      } else if (e instanceof ApiError) {
        setErroModal(e.message);
      } else {
        setErroModal('Não foi possível cadastrar a amostra agora. Tente novamente.');
      }
    } finally {
      setSalvandoModal(false);
    }
  }

  function fecharModalNovaAmostra() {
    if (salvandoModal) return;
    const preenchido = (Object.keys(identificacaoModal) as (keyof Identificacao)[]).some(
      (campo) => campo !== 'dataRecebimento' && campo !== 'prazo' && String(identificacaoModal[campo] ?? '').trim() !== '',
    );
    if (preenchido && !window.confirm('Descartar os dados preenchidos da nova amostra?')) return;
    setModalAberto(false);
  }

  function aoAbrirAmostra(protocolo: string) {
    retomarAmostra(protocolo);
    navigate(rotaAnalise(protocolo));
  }

  return (
    <>
      <LinhasVelocidade className="painel-min__velocidade" />
      <Navbar titulo="Módulo do Analista" />
      <main id="conteudo" className="page-container" tabIndex={-1}>
        <div className="page-header">
          <div>
            <span className="page-header__eyebrow">Laboratório de Solos &middot; Uso interno</span>
            <h1>
              <span>Painel do</span> <span className="painel-min__destaque">Analista</span>
            </h1>
          </div>
        </div>

        <Card className="dashboard-cta">
          <CardBody>
            <div className="dashboard-cta__conteudo">
              <h2>Registrar Nova Análise</h2>
              <Button onClick={abrirModalNovaAmostra}>
                Registrar Nova Análise
                <SetaVelocidade />
              </Button>
            </div>
          </CardBody>
        </Card>

        {listagem.tipo === 'carregando' && <CarregandoPagina rotulo="Carregando amostras…" />}
        {listagem.tipo === 'erro' && (
          <div className="estado-bloco estado-bloco--erro dashboard-listagem-erro" role="alert">
            <strong className="estado-bloco__titulo">Não foi possível carregar as amostras do servidor</strong>
            {listagem.mensagem}
            <div className="estado-bloco__acoes">
              <button type="button" className="link-acao" onClick={() => setRecargaListagem((n) => n + 1)}>
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader
            title="Prazos para Entregar Laudos"
            action={
              <div className="dashboard-acoes-secao">
                <CampoBusca id="busca-pendentes" valor={buscaPendentes} onChange={setBuscaPendentes} />
                <SeletorOrdem
                  id="ordem-pendentes"
                  valor={ordemPendentes}
                  opcoes={OPCOES_ORDEM_PENDENTES}
                  onChange={setOrdemPendentes}
                />
                <BotaoExpandir expandida={pendentesExpandido} onAlternar={() => setPendentesExpandido((v) => !v)} />
              </div>
            }
          />
          <CardBody>
            {pendentes.length > 0 && (
              <div className="dashboard-situacoes" role="group" aria-label="Filtrar por situação">
                {contagemSituacao.map((situacao) => (
                  <button
                    key={situacao.valor}
                    type="button"
                    className={`dashboard-situacao ${filtroSituacao === situacao.valor ? 'dashboard-situacao--ativa' : ''}`.trim()}
                    aria-pressed={filtroSituacao === situacao.valor}
                    onClick={() => setFiltroSituacao(situacao.valor)}
                  >
                    {situacao.rotulo} <span className="dashboard-situacao__total">{situacao.total}</span>
                  </button>
                ))}
              </div>
            )}
            {pendentes.length === 0 ? (
              <EstadoVazio mensagem="Nenhum laudo pendente no momento. Clique em “Registrar Nova Análise” para começar." />
            ) : pendentesFiltrados.length === 0 ? (
              <div>
                <EstadoVazio
                  mensagem={
                    buscaPendentes.trim()
                      ? `Nenhuma amostra pendente encontrada para “${buscaPendentes.trim()}”.`
                      : 'Nenhuma amostra nesta situação.'
                  }
                />
                <button
                  type="button"
                  className="link-acao"
                  onClick={() => {
                    setBuscaPendentes('');
                    setFiltroSituacao('todas');
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <FaixaPaginada
                chaveReinicio={`${buscaPendentes}|${ordemPendentes}|${filtroSituacao}`}
                expandida={pendentesExpandido}
                itens={pendentesFiltrados.map((cartao) => (
                  <CartaoBloco
                    key={cartao.protocolo}
                    cartao={cartao}
                    mostrarPrazo
                    onAbrir={() => aoAbrirAmostra(cartao.protocolo)}
                  />
                ))}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Histórico de Laudos"
            action={
              <div className="dashboard-acoes-secao">
                <CampoBusca id="busca-historico" valor={buscaHistorico} onChange={setBuscaHistorico} />
                <SeletorOrdem
                  id="ordem-historico"
                  valor={ordemHistorico}
                  opcoes={OPCOES_ORDEM_HISTORICO}
                  onChange={setOrdemHistorico}
                />
                <BotaoExpandir expandida={historicoExpandido} onAlternar={() => setHistoricoExpandido((v) => !v)} />
              </div>
            }
          />
          <CardBody>
            {concluidas.length === 0 ? (
              <EstadoVazio mensagem="Nenhum laudo homologado ainda." />
            ) : concluidasFiltradas.length === 0 ? (
              <EstadoVazio mensagem={`Nenhum laudo encontrado para “${buscaHistorico.trim()}”.`} />
            ) : (
              <FaixaPaginada
                chaveReinicio={`${buscaHistorico}|${ordemHistorico}`}
                expandida={historicoExpandido}
                itens={concluidasFiltradas.map((cartao) => (
                  <CartaoBloco
                    key={cartao.protocolo}
                    cartao={cartao}
                    mostrarPrazo={false}
                    onAbrir={() => aoAbrirAmostra(cartao.protocolo)}
                  />
                ))}
              />
            )}
          </CardBody>
        </Card>
      </main>
      <Footer />

      <NovaAmostraModal
        isOpen={modalAberto}
        identificacao={identificacaoModal}
        onChange={setIdentificacaoModal}
        onClose={fecharModalNovaAmostra}
        onCriar={aoCriarAmostra}
        erro={erroModal}
        carregando={salvandoModal}
      />
    </>
  );
}
