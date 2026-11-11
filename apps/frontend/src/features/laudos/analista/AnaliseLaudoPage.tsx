import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { CarregandoPagina } from '@/components/feedback/CarregandoPagina';
import { useAuth } from '@/context/AuthContext';
import { useAnalista } from '@/context/AnalistaContext';
import { analiseService, type AmostraMetadata, type ObterAnaliseApiResponse } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { infoStatusLaudo, laudoConcluido as statusConcluido } from '@/lib/statusLaudo';
import { FUNCIONALIDADES } from '@/config/ambiente';
import { DADOS_ANALISE_VAZIOS, ROTULOS_TIPO_ANALISE, type DadosAnalise, type Identificacao } from './tipos';
import { RegistroForm, type ErrosCamposRegistro } from './RegistroForm';
import { HomologacaoView, type ResultadoHomologacao } from './HomologacaoView';
import { formatarData } from './statusAmostra';
import { FATOR_NAOH_PADRAO, fatorNaohValido } from './calculos';
import { avaliarDadosAnalise, pendenciasParaProcessar } from './validacaoAnalise';
import '@/components/feedback/Feedback.css';
import './AnaliseLaudoPage.css';

type Aba = 'registro' | 'homologacao';
type StatusSalvamento = 'salvo' | 'salvando' | 'erro' | 'conflito' | 'idle';
type EstadoCarga = { tipo: 'carregando' } | { tipo: 'pronto' } | { tipo: 'nao_encontrada' } | { tipo: 'erro'; mensagem: string };

const ATRASO_AUTO_SAVE_MS = 1500;

function montarDados(res: ObterAnaliseApiResponse['dados'], identificacao: Identificacao): DadosAnalise {
  const { quimica, granulometria, calibracao } = res.dadosBancada;
  const vazio = DADOS_ANALISE_VAZIOS;
  const campo = (valor: { medido?: number | null; branco?: number | null } | null | undefined) => ({
    medido: valor?.medido ?? 0,
    branco: valor?.branco ?? 0,
  });
  return {
    identificacao,
    quimica: {
      ph: quimica.ph ?? vazio.quimica.ph,
      fosforoAbsBruta: quimica.fosforoAbsBruta ?? vazio.quimica.fosforoAbsBruta,
      sodioMgL: quimica.sodioMgL ?? vazio.quimica.sodioMgL,
      potassioMgL: quimica.potassioMgL ?? vazio.quimica.potassioMgL,
      calcio: campo(quimica.calcio),
      magnesio: campo(quimica.magnesio),
      aluminio: campo(quimica.aluminio),
      acidezPotencial: {
        ...campo(quimica.acidezPotencial),
        fator: quimica.acidezPotencial?.fator ?? FATOR_NAOH_PADRAO,
      },
    },
    granulometria: {
      tfsa: granulometria.tfsa ?? vazio.granulometria.tfsa,
      areiaBecker: granulometria.areiaBecker ?? vazio.granulometria.areiaBecker,
      areiaBeckerVazio: granulometria.areiaBeckerVazio ?? vazio.granulometria.areiaBeckerVazio,
      argilaBecker: granulometria.argilaBecker ?? vazio.granulometria.argilaBecker,
      argilaBeckerVazio: granulometria.argilaBeckerVazio ?? vazio.granulometria.argilaBeckerVazio,
      naohBecker: granulometria.naohBecker ?? vazio.granulometria.naohBecker,
      naohBeckerVazio: granulometria.naohBeckerVazio ?? vazio.granulometria.naohBeckerVazio,
    },
    calibracao:
      calibracao?.a != null && calibracao.b != null && calibracao.r2 != null
        ? { a: calibracao.a, b: calibracao.b, r2: calibracao.r2, pontos: calibracao.pontos ?? undefined }
        : null,
  };
}

export function AnaliseLaudoPage() {
  const { protocolo: protocoloParam = '' } = useParams();
  const protocoloAlvo = protocoloParam.trim();
  useTituloPagina(`Análise ${protocoloAlvo}`);
  const { session } = useAuth();
  const token = session?.token;
  const navigate = useNavigate();
  const {
    amostraAtual,
    statusAmostraAtual,
    retomarAmostra,
    atualizarAmostraAtual,
    concluirAmostraAtual,
    marcarAguardandoHomologacao,
  } = useAnalista();

  const amostraDaRota = amostraAtual?.identificacao.protocolo === protocoloAlvo ? amostraAtual : null;
  const identificacaoRef = useRef<Identificacao | null>(amostraDaRota?.identificacao ?? null);
  identificacaoRef.current = amostraDaRota?.identificacao ?? identificacaoRef.current;

  const [aba, setAba] = useState<Aba>(statusAmostraAtual === 'concluido' && amostraDaRota ? 'homologacao' : 'registro');
  const [dados, setDados] = useState<DadosAnalise>(amostraDaRota ?? DADOS_ANALISE_VAZIOS);
  const [versao, setVersao] = useState<number>(1);
  const [statusServidor, setStatusServidor] = useState<string>('EM_ANALISE');
  const [amostraInfo, setAmostraInfo] = useState<AmostraMetadata | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>({ tipo: 'carregando' });
  const [tentativaCarga, setTentativaCarga] = useState(0);

  const [processando, setProcessando] = useState<boolean>(false);
  const [statusSalvamento, setStatusSalvamento] = useState<StatusSalvamento>('idle');
  const [horarioSalvo, setHorarioSalvo] = useState<string | null>(null);
  const [errosProcessamento, setErrosProcessamento] = useState<string[] | null>(null);
  const [errosCampos, setErrosCampos] = useState<ErrosCamposRegistro>({});
  const [tentativaValidacao, setTentativaValidacao] = useState(0);

  const versaoRef = useRef(versao);
  versaoRef.current = versao;
  const timerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoDadosSalvosRef = useRef<string>('');
  const pendenteRef = useRef<DadosAnalise | null>(null);
  const salvarRef = useRef<(proximo: DadosAnalise) => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (protocoloAlvo && amostraAtual?.identificacao.protocolo !== protocoloAlvo) retomarAmostra(protocoloAlvo);
  }, [protocoloAlvo, amostraAtual?.identificacao.protocolo, retomarAmostra]);

  useEffect(() => {
    if (!token || !protocoloAlvo) return;
    const controlador = new AbortController();
    setEstadoCarga({ tipo: 'carregando' });
    setStatusSalvamento('idle');
    setErrosProcessamento(null);

    analiseService
      .obterAnalise(protocoloAlvo, token, controlador.signal)
      .then((res) => {
        const identificacao = identificacaoRef.current ?? {
          ...DADOS_ANALISE_VAZIOS.identificacao,
          protocolo: res.dados.protocolo || protocoloAlvo,
          solicitante: res.dados.amostra?.solicitante ?? '',
          propriedade: res.dados.amostra?.propriedade ?? '',
        };
        const carregados = montarDados(res.dados, identificacao);
        setVersao(res.dados.versao);
        setStatusServidor(res.dados.status);
        setAmostraInfo(res.dados.amostra);
        setDados(carregados);
        if (identificacaoRef.current) atualizarAmostraAtual(carregados);
        ultimoDadosSalvosRef.current = JSON.stringify(carregados);
        if (statusConcluido(res.dados.status)) setAba('homologacao');
        setEstadoCarga({ tipo: 'pronto' });
      })
      .catch((erro: unknown) => {
        if (erro instanceof ApiError && erro.foiCancelada) return;
        if (erro instanceof ApiError && erro.status === 404) setEstadoCarga({ tipo: 'nao_encontrada' });
        else
          setEstadoCarga({
            tipo: 'erro',
            mensagem: erro instanceof ApiError ? erro.message : 'Não foi possível carregar os dados da amostra.',
          });
      });

    return () => controlador.abort();
  }, [token, protocoloAlvo, tentativaCarga, atualizarAmostraAtual]);

  const salvarRascunhoAgora = useCallback(
    async (proximo: DadosAnalise) => {
      if (!token) return;
      pendenteRef.current = null;
      setStatusSalvamento('salvando');
      try {
        const res = await analiseService.salvarRascunho(
          protocoloAlvo,
          {
            versaoEsperada: versaoRef.current,
            quimica: proximo.quimica,
            granulometria: proximo.granulometria,
            calibracao: proximo.calibracao,
          },
          token,
        );
        setVersao(res.dados.novaVersao);
        setStatusServidor(res.dados.status);
        setStatusSalvamento('salvo');
        setHorarioSalvo(new Date().toLocaleTimeString('pt-BR'));
        ultimoDadosSalvosRef.current = JSON.stringify(proximo);
      } catch (e) {
        pendenteRef.current = proximo;
        setStatusSalvamento(e instanceof ApiError && e.status === 409 ? 'conflito' : 'erro');
      }
    },
    [token, protocoloAlvo],
  );
  salvarRef.current = salvarRascunhoAgora;

  const cancelarAutoSave = useCallback(() => {
    if (timerDebounceRef.current) {
      clearTimeout(timerDebounceRef.current);
      timerDebounceRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      cancelarAutoSave();
      const pendente = pendenteRef.current;
      if (pendente) void salvarRef.current(pendente);
    },
    [cancelarAutoSave],
  );

  useEffect(() => {
    const aoReconectar = () => {
      const pendente = pendenteRef.current;
      if (pendente) void salvarRef.current(pendente);
    };
    window.addEventListener('online', aoReconectar);
    return () => window.removeEventListener('online', aoReconectar);
  }, []);

  useEffect(() => {
    const aviso = (evento: BeforeUnloadEvent) => {
      if (pendenteRef.current || statusSalvamento === 'salvando') {
        evento.preventDefault();
        evento.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [statusSalvamento]);

  const dispararAutoSave = useCallback(
    (proximo: DadosAnalise) => {
      if (!token) return;
      cancelarAutoSave();
      if (JSON.stringify(proximo) === ultimoDadosSalvosRef.current) {
        pendenteRef.current = null;
        setStatusSalvamento((atual) => (atual === 'salvando' ? 'salvo' : atual));
        return;
      }
      pendenteRef.current = proximo;
      setStatusSalvamento('salvando');
      timerDebounceRef.current = setTimeout(() => {
        timerDebounceRef.current = null;
        void salvarRascunhoAgora(proximo);
      }, ATRASO_AUTO_SAVE_MS);
    },
    [token, salvarRascunhoAgora, cancelarAutoSave],
  );

  function enviarRascunhoPendente() {
    const pendente = pendenteRef.current;
    if (pendente) void salvarRascunhoAgora(pendente);
  }

  function handleDadosChange(proximo: DadosAnalise) {
    setErrosCampos((atual) => {
      if (!atual.tfsa && !atual.calibracao) return atual;
      const restante = { ...atual };
      if (proximo.granulometria.tfsa > 0) delete restante.tfsa;
      if (proximo.calibracao?.a) delete restante.calibracao;
      return restante;
    });
    setDados(proximo);
    if (identificacaoRef.current) atualizarAmostraAtual(proximo);
    dispararAutoSave(proximo);
  }

  async function handleProcessar() {
    if (!token || processando) return;
    cancelarAutoSave();
    setErrosProcessamento(null);

    const pendentes: ErrosCamposRegistro = {};
    if (!dados.calibracao || !dados.calibracao.a) {
      pendentes.calibracao = 'Aplique a curva de calibração de fósforo antes de processar.';
    }
    if (!(dados.granulometria.tfsa > 0)) {
      pendentes.tfsa = 'Informe o peso da amostra (TFSA) para processar.';
    }
    setErrosCampos(pendentes);
    const bloqueantes = avaliarDadosAnalise(dados).filter((aviso) => aviso.bloqueante);
    if (bloqueantes.length > 0) {
      setErrosProcessamento(bloqueantes.map((aviso) => aviso.mensagem));
      enviarRascunhoPendente();
      return;
    }
    if (!fatorNaohValido(dados.quimica.acidezPotencial.fator)) {
      setErrosProcessamento(['Informe um fator de correção do NaOH maior que zero na acidez potencial (H+Al).']);
      document.getElementById('campo-h-al-fator')?.focus();
      return;
    }
    if (pendentes.calibracao || pendentes.tfsa || !dados.calibracao) {
      setTentativaValidacao((n) => n + 1);
      enviarRascunhoPendente();
      return;
    }

    setProcessando(true);
    try {
      const res = await analiseService.processarAnalise(
        protocoloAlvo,
        {
          versaoEsperada: versaoRef.current,
          quimica: dados.quimica,
          granulometria: dados.granulometria,
          calibracao: dados.calibracao,
        },
        token,
      );
      setVersao(res.dados.novaVersao);
      setStatusServidor(res.dados.status);
      setStatusSalvamento('salvo');
      ultimoDadosSalvosRef.current = JSON.stringify(dados);
      pendenteRef.current = null;
      marcarAguardandoHomologacao();
      irParaAba('homologacao');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) {
          setStatusSalvamento('conflito');
        } else if (e.erros && e.erros.length > 0) {
          const doBackend: ErrosCamposRegistro = {};
          const gerais = e.erros.filter((msg) => {
            if (/tfsa/i.test(msg)) doBackend.tfsa = 'Informe o peso da amostra (TFSA) para processar.';
            else if (/calibra/i.test(msg)) doBackend.calibracao = 'Aplique a curva de calibração de fósforo antes de processar.';
            else return true;
            return false;
          });
          setErrosCampos(doBackend);
          setErrosProcessamento(gerais.length > 0 ? gerais : null);
          if (doBackend.tfsa || doBackend.calibracao) setTentativaValidacao((n) => n + 1);
        } else {
          setErrosProcessamento([e.message]);
        }
      } else {
        setErrosProcessamento(['Ocorreu um erro inesperado ao processar os cálculos agronômicos.']);
      }
      if (!(e instanceof ApiError && e.status === 409)) enviarRascunhoPendente();
    } finally {
      setProcessando(false);
    }
  }

  async function handleHomologar(): Promise<ResultadoHomologacao> {
    if (!FUNCIONALIDADES.homologacaoServidor) {
      if (!import.meta.env.DEV) return { ok: false, mensagem: 'A homologação ainda não está disponível no servidor.' };
      concluirAmostraAtual();
      return { ok: true, simulado: true };
    }
    if (!token) return { ok: false, mensagem: 'Sua sessão expirou. Entre novamente para continuar.' };
    try {
      const res = await analiseService.homologarLaudo(protocoloAlvo, { versaoEsperada: versaoRef.current }, token);
      setVersao(res.dados.novaVersao);
      setStatusServidor(res.dados.status);
      concluirAmostraAtual();
      return { ok: true, simulado: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        return { ok: false, mensagem: 'O laudo foi alterado por outra pessoa. Recarregue a página antes de homologar.' };
      }
      return { ok: false, mensagem: e instanceof ApiError ? e.message : 'Não foi possível homologar o laudo agora.' };
    }
  }

  function irParaAba(proxima: Aba) {
    setAba(proxima);
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduzir ? 'auto' : 'smooth' });
  }

  const laudoConcluido = statusConcluido(statusServidor) || (statusAmostraAtual === 'concluido' && !!amostraDaRota);
  const status = infoStatusLaudo(statusServidor);
  const identificacao = dados.identificacao;
  const solicitante = amostraInfo?.solicitante || identificacao.solicitante;
  const detalhesAmostra = [
    { rotulo: 'Propriedade', valor: amostraInfo?.propriedade || identificacao.propriedade },
    { rotulo: 'Localização', valor: identificacao.localizacao },
    { rotulo: 'Identificação da área', valor: identificacao.areaIdentificacao },
    { rotulo: 'Profundidade da coleta', valor: identificacao.profundidadeColeta },
    { rotulo: 'Cultivo', valor: identificacao.cultivo },
    { rotulo: 'Tipo de análise', valor: identificacao.tipoAnalise ? ROTULOS_TIPO_ANALISE[identificacao.tipoAnalise] : '' },
    { rotulo: 'Recebimento', valor: identificacao.dataRecebimento ? formatarData(identificacao.dataRecebimento) : '' },
    {
      rotulo: 'Registrada em',
      valor: !identificacao.dataRecebimento && amostraInfo?.dataColeta ? formatarData(amostraInfo.dataColeta) : '',
    },
    { rotulo: 'Prazo do laudo', valor: identificacao.prazo ? formatarData(identificacao.prazo) : '' },
  ].filter((detalhe) => detalhe.valor);

  function renderizarConteudo() {
    if (estadoCarga.tipo === 'carregando') return <CarregandoPagina rotulo="Carregando dados da amostra…" />;
    if (estadoCarga.tipo === 'nao_encontrada') {
      return (
        <div className="estado-bloco estado-bloco--info" role="alert">
          <strong className="estado-bloco__titulo">Amostra não encontrada</strong>
          Não existe amostra cadastrada com o protocolo {protocoloAlvo}. Confira o protocolo ou volte ao painel.
          <div className="estado-bloco__acoes">
            <Link to="/analista" className="link-acao">
              Voltar para o Painel do Analista
            </Link>
          </div>
        </div>
      );
    }
    if (estadoCarga.tipo === 'erro') {
      return (
        <div className="estado-bloco estado-bloco--erro" role="alert">
          <strong className="estado-bloco__titulo">Não foi possível carregar a amostra</strong>
          {estadoCarga.mensagem}
          <div className="estado-bloco__acoes">
            <button type="button" className="link-acao" onClick={() => setTentativaCarga((n) => n + 1)}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    if (aba === 'registro' && !laudoConcluido) {
      const pendencias = pendenciasParaProcessar(dados);
      return (
        <>
          <div
            className={`analise-situacao ${pendencias.bloqueantes.length > 0 ? '' : 'analise-situacao--pronta'}`.trim()}
            aria-live="polite"
          >
            <strong className="analise-situacao__titulo">
              {pendencias.bloqueantes.length > 0 ? 'Análise em andamento: ainda não terminou' : 'Pronta para processar'}
            </strong>
            {pendencias.bloqueantes.length > 0 && <span>Falta: {pendencias.bloqueantes.join(', ')}.</span>}
            {pendencias.semValor.length > 0 && (
              <span className="analise-situacao__info">Ainda sem valor: {pendencias.semValor.join(', ')}.</span>
            )}
            {statusServidor === 'AGUARDANDO_HOMOLOGACAO' && (
              <span className="analise-situacao__info">
                Os cálculos já foram processados. Se alterar algum valor, processe de novo antes de homologar.
              </span>
            )}
          </div>
          <RegistroForm
          dados={dados}
          onChange={handleDadosChange}
          onProcessar={handleProcessar}
          processando={processando}
          statusSalvamento={statusSalvamento}
          horarioSalvo={horarioSalvo}
          errosProcessamento={errosProcessamento}
          errosCampos={errosCampos}
          tentativaValidacao={tentativaValidacao}
          onRecarregar={() => setTentativaCarga((n) => n + 1)}
          onTentarSalvar={enviarRascunhoPendente}
          />
        </>
      );
    }
    return (
      <HomologacaoView
        dados={dados}
        responsavel={session?.nome ?? ''}
        jaLiberado={laudoConcluido}
        processada={statusServidor === 'AGUARDANDO_HOMOLOGACAO' || laudoConcluido}
        onVoltarParaEdicao={() => irParaAba('registro')}
        onHomologar={handleHomologar}
      />
    );
  }

  return (
    <>
      <Navbar titulo="Módulo do Analista" />
      <main id="conteudo" className="page-container" tabIndex={-1}>
        <header className="analise-cabecalho">
          <div className="analise-cabecalho__topo">
            <div>
              <span className="page-header__eyebrow">Laboratório de Solos &middot; Uso interno</span>
              <h1>Gestão de Análises Laboratoriais</h1>
            </div>
            {estadoCarga.tipo === 'pronto' && <Badge variant={status.variant}>{status.rotulo}</Badge>}
          </div>

          <div className="analise-amostra">
            <div className="analise-amostra__quem">
              <span className="analise-amostra__rotulo">Solicitante</span>
              <strong className="analise-amostra__solicitante">{solicitante || 'Não informado'}</strong>
              <span className="analise-amostra__rotulo">Protocolo da amostra</span>
              <span className="analise-amostra__protocolo">{protocoloAlvo}</span>
            </div>
            <div className="analise-amostra__dados">
              {detalhesAmostra.length > 0 && (
                <dl className="analise-amostra__detalhes">
                  {detalhesAmostra.map((detalhe) => (
                    <div key={detalhe.rotulo}>
                      <dt>{detalhe.rotulo}</dt>
                      <dd>{detalhe.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {!amostraDaRota && estadoCarga.tipo === 'pronto' && (
                <p className="analise-amostra__aviso">
                  Os demais dados do cadastro (localização, área, cultivo, prazo) ainda não são enviados pelo servidor
                  nesta tela.
                </p>
              )}
            </div>
          </div>
        </header>

        <nav className="subnav" aria-label="Navegação da análise">
          <button type="button" className="subnav__btn" onClick={() => navigate('/analista')}>
            &larr; Voltar para o Painel do Analista
          </button>
          {aba === 'homologacao' && !laudoConcluido && estadoCarga.tipo === 'pronto' && (
            <button type="button" className="subnav__btn" onClick={() => irParaAba('registro')}>
              &larr; Voltar para Registrar Dados
            </button>
          )}
        </nav>

        {renderizarConteudo()}
      </main>
      <Footer />
    </>
  );
}
