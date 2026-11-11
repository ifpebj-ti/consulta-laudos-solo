import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { classificarFalhaPdf, laudoService, type FalhaPdf } from '@/services/laudoService';
import { LinhasVelocidade } from '@/features/home/LayoutEntrada';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { useConexao } from '@/hooks/useConexao';
import { ETAPAS_LAUDO, infoStatusLaudo, type InfoStatusLaudo } from '@/lib/statusLaudo';
import { formatarDataHoraServidor } from '@/lib/datas';
import { descreverPrevisaoEntrega } from '@/lib/previsaoEntrega';
import type { LaudoDetalhe } from '@/types/laudo';
import { useSituacaoLaudo } from './useSituacaoLaudo';
import '@/styles/painel-minimalista.css';
import '@/components/feedback/Feedback.css';
import './LaudoDetalhePage.css';

type EstadoPdf =
  | { tipo: 'ocioso' }
  | { tipo: 'baixando' }
  | { tipo: 'concluido'; nomeArquivo: string }
  | { tipo: 'falha'; falha: FalhaPdf };

const TEMPO_FEEDBACK_COPIA_MS = 2000;

const textoOuTraco = (valor: string | null | undefined) => (valor && valor.trim() ? valor.trim() : '—');

function IconeDownload() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

function LinhaEtapas({ status }: { status: InfoStatusLaudo }) {
  if (status.etapaAtual === null) return null;
  const atual = status.etapaAtual;
  return (
    <ol className="etapas-laudo" aria-label="Etapas do laudo">
      {ETAPAS_LAUDO.map((etapa, indice) => {
        const situacao = indice < atual ? 'concluida' : indice === atual ? 'atual' : 'futura';
        return (
          <li
            key={etapa}
            className={`etapas-laudo__item etapas-laudo__item--${situacao}`}
            aria-current={situacao === 'atual' ? 'step' : undefined}
          >
            <span className="etapas-laudo__marca" aria-hidden="true" />
            <span className="etapas-laudo__nome">{etapa}</span>
            <span className="visually-hidden">
              {situacao === 'concluida' ? ' (concluída)' : situacao === 'atual' ? ' (etapa atual)' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PainelSituacao({ laudo, status }: { laudo: LaudoDetalhe; status: InfoStatusLaudo }) {
  if (status.categoria === 'emitido') return null;
  const previsao = descreverPrevisaoEntrega(laudo.dataPrevistaEntrega);
  const mostrarPrevisao = status.categoria === 'aguardando' || status.categoria === 'andamento';
  const classe =
    status.categoria === 'bloqueado'
      ? 'situacao-laudo situacao-laudo--bloqueado'
      : status.categoria === 'desconhecido'
        ? 'situacao-laudo situacao-laudo--neutro'
        : 'situacao-laudo';
  return (
    <section className={classe} aria-labelledby="titulo-situacao">
      <h2 id="titulo-situacao" className="situacao-laudo__titulo">
        {status.titulo}
      </h2>
      <p className="situacao-laudo__texto">{status.descricaoCliente}</p>
      <LinhaEtapas status={status} />
      {mostrarPrevisao && (
        <p
          className={`situacao-laudo__previsao ${previsao.situacao === 'atrasada' ? 'situacao-laudo__previsao--atrasada' : ''}`.trim()}
        >
          {previsao.texto}
        </p>
      )}
    </section>
  );
}

export function LaudoDetalhePage() {
  const { session, atualizarLaudo } = useAuth();
  const online = useConexao();
  const [estadoPdf, setEstadoPdf] = useState<EstadoPdf>({ tipo: 'ocioso' });
  const [copiado, setCopiado] = useState(false);
  const controladorRef = useRef<AbortController | null>(null);
  const avisoPdfRef = useRef<HTMLDivElement>(null);
  const laudo = session?.laudo;
  const status = infoStatusLaudo(laudo?.status);
  useTituloPagina(laudo ? `Laudo ${laudo.protocolo}` : 'Laudo');

  const situacao = useSituacaoLaudo({
    protocolo: laudo?.protocolo ?? '',
    token: session?.token ?? '',
    emAndamento: status.categoria === 'aguardando' || status.categoria === 'andamento',
    onAtualizado: atualizarLaudo,
  });

  useEffect(() => () => controladorRef.current?.abort(), []);

  useEffect(() => {
    if (estadoPdf.tipo === 'falha') avisoPdfRef.current?.focus();
  }, [estadoPdf]);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = window.setTimeout(() => setCopiado(false), TEMPO_FEEDBACK_COPIA_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  if (!session || !laudo) {
    return <Navigate to="/cliente" replace />;
  }

  const { token } = session;
  const emitido = status.categoria === 'emitido';
  const dataEmissao = formatarDataHoraServidor(laudo.dataEmissao);
  const baixando = estadoPdf.tipo === 'baixando';
  const versaoAtualizada =
    emitido && (laudo.versao ?? 1) > 1 && laudo.atualizadoEm ? formatarDataHoraServidor(laudo.atualizadoEm) : null;
  const consultadoEm = session.consultadoEm ? formatarDataHoraServidor(session.consultadoEm, true) : null;

  const dadosLaudo: Array<{ rotulo: string; valor: string; destaque?: boolean; copiavel?: boolean }> = [
    { rotulo: 'Titular', valor: textoOuTraco(laudo.cliente?.nome), destaque: true },
    { rotulo: 'CPF do titular', valor: textoOuTraco(laudo.cliente?.cpfMascarado) },
    { rotulo: 'Protocolo', valor: textoOuTraco(laudo.protocolo), copiavel: Boolean(laudo.protocolo) },
    { rotulo: 'Propriedade', valor: textoOuTraco(laudo.propriedade) },
    { rotulo: 'Emitido em', valor: emitido && dataEmissao !== '—' ? dataEmissao : 'Aguardando emissão' },
  ];

  const copiarProtocolo = async () => {
    try {
      await navigator.clipboard.writeText(laudo.protocolo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const aoBaixarPdf = async () => {
    if (baixando) return;
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    setEstadoPdf({ tipo: 'baixando' });
    try {
      const nomeArquivo = await laudoService.baixarPdf(laudo.protocolo, token, controlador.signal);
      if (!controlador.signal.aborted) setEstadoPdf({ tipo: 'concluido', nomeArquivo });
    } catch (erro) {
      const falha = classificarFalhaPdf(erro);
      if (falha.motivo !== 'cancelado' && !controlador.signal.aborted) setEstadoPdf({ tipo: 'falha', falha });
    }
  }

  const renderizarAvisoPdf = () => {
    if (estadoPdf.tipo === 'concluido') {
      return (
        <p className="download-status">
          Download iniciado: <strong>{estadoPdf.nomeArquivo}</strong>
        </p>
      );
    }
    if (estadoPdf.tipo !== 'falha') return null;
    const { falha } = estadoPdf;
    const informativo = falha.motivo === 'indisponivel';
    return (
      <div
        ref={avisoPdfRef}
        tabIndex={-1}
        className={`estado-bloco ${informativo ? 'estado-bloco--info' : 'estado-bloco--erro'}`}
        role="alert"
      >
        <strong className="estado-bloco__titulo">
          {informativo ? 'PDF ainda não disponível' : 'Não foi possível baixar o PDF'}
        </strong>
        {falha.mensagem}
        {falha.podeTentarNovamente && (
          <div className="estado-bloco__acoes">
            <button type="button" className="link-acao" onClick={aoBaixarPdf} disabled={baixando || !online}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    );
  }

  const renderizarAcaoPdf = () => {
    if (emitido && laudo.temPdfDisponivel) {
      return (
        <Button
          variant="download"
          lg
          className="download-laudo__botao"
          onClick={aoBaixarPdf}
          disabled={baixando || !online}
          aria-busy={baixando}
        >
          <IconeDownload />
          {baixando ? 'Gerando PDF...' : 'Baixar laudo (PDF)'}
        </Button>
      );
    }
    return (
      <Button variant="ghost" lg className="download-laudo__botao" disabled>
        {status.categoria === 'bloqueado' ? 'Download indisponível' : 'PDF ainda não disponível'}
      </Button>
    );
  }

  const textoDownload = () => {
    if (emitido && laudo.temPdfDisponivel) {
      return 'Documento oficial em PDF, com todos os resultados da análise e a assinatura do responsável técnico.';
    }
    if (status.categoria === 'bloqueado') return 'O PDF não está disponível para este laudo. Fale com o laboratório.';
    if (emitido) return 'O laudo foi emitido, mas o PDF ainda está sendo preparado. Tente novamente em alguns minutos.';
    return 'O PDF oficial é liberado depois que o responsável técnico homologa o laudo. Volte a consultar mais tarde.';
  }

  return (
    <div className="painel-min painel-min--cliente">
      <LinhasVelocidade className="painel-min__velocidade" />
      <Navbar titulo="Portal do Cliente" />
      <main id="conteudo" className="page-container cliente-shell" tabIndex={-1}>
        <div className="detalhe-cabecalho">
          <div className="detalhe-cabecalho__topo">
            <div>
              <p className="page-header__eyebrow">Laudo de análise de solo</p>
              <h1>
                <span>Laudo Técnico</span>
                <span className="visually-hidden"> — </span>
                <span className="painel-min__destaque">{textoOuTraco(laudo.protocolo)}</span>
              </h1>
            </div>
            <div aria-live="polite">
              <Badge variant={status.variant}>{status.rotulo}</Badge>
            </div>
          </div>
          {versaoAtualizada && (
            <p className="detalhe-versao">
              Versão atualizada em {versaoAtualizada}. O download traz sempre a versão mais recente.
            </p>
          )}
        </div>

        {!online && (
          <div className="estado-bloco estado-bloco--erro detalhe-offline" role="status">
            <strong className="estado-bloco__titulo">Sem conexão com a internet</strong>
            Conecte-se para atualizar a situação ou baixar o laudo.
          </div>
        )}

        <div aria-live="polite">
          <PainelSituacao laudo={laudo} status={status} />
        </div>

        <section className="detalhe-modulo" aria-labelledby="titulo-dados">
          <h2 id="titulo-dados" className="detalhe-modulo__titulo">
            Dados do laudo
          </h2>
          <dl className="dados-laudo">
            {dadosLaudo.map((dado) => (
              <div className={`dados-laudo__item ${dado.destaque ? 'dados-laudo__item--destaque' : ''}`.trim()} key={dado.rotulo}>
                <dt>{dado.rotulo}</dt>
                <dd>
                  {dado.valor}
                  {dado.copiavel && (
                    <button type="button" className="dados-laudo__copiar" onClick={() => void copiarProtocolo()}>
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <span className="visually-hidden" aria-live="polite">
            {copiado ? 'Protocolo copiado.' : ''}
          </span>
        </section>

        <section className="detalhe-modulo download-laudo" aria-labelledby="titulo-pdf">
          <h2 id="titulo-pdf" className="detalhe-modulo__titulo">
            Laudo técnico completo
          </h2>
          <div className="download-laudo__corpo">
            <p className="download-laudo__texto">{textoDownload()}</p>
            {renderizarAcaoPdf()}
          </div>
          <div aria-live="polite">{renderizarAvisoPdf()}</div>
        </section>

        {(consultadoEm || situacao.habilitado) && (
          <div className="detalhe-atualizacao">
            {consultadoEm && <span>Situação consultada em {consultadoEm}.</span>}
            {situacao.habilitado && (
              <button
                type="button"
                className="link-acao"
                onClick={situacao.atualizar}
                disabled={situacao.estado.tipo === 'atualizando' || !online}
              >
                {situacao.estado.tipo === 'atualizando' ? 'Atualizando...' : 'Atualizar situação'}
              </button>
            )}
            {situacao.estado.tipo === 'erro' && (
              <span className="detalhe-atualizacao__erro" role="alert">
                {situacao.estado.mensagem}
              </span>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
