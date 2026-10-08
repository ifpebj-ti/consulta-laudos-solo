import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useAnalista } from '@/context/AnalistaContext';
import { analiseService, type AmostraMetadata } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { DADOS_ANALISE_VAZIOS, type DadosAnalise } from './tipos';
import { RegistroForm, type ErrosCamposRegistro } from './RegistroForm';
import { HomologacaoView } from './HomologacaoView';
import './AnaliseLaudoPage.css';

type Aba = 'registro' | 'homologacao';
type StatusSalvamento = 'salvo' | 'salvando' | 'erro' | 'conflito' | 'idle';

const PROTOCOLO_PADRAO = 'LAB-2026-0142';

export function AnaliseLaudoPage() {
  const { session } = useAuth();
  const token = session?.token;
  const navigate = useNavigate();
  const { amostraAtual, statusAmostraAtual, atualizarAmostraAtual, concluirAmostraAtual } = useAnalista();
  // Laudo já homologado (aberto pelo Histórico): mostra direto o laudo, sem voltar para edição
  const laudoConcluido = statusAmostraAtual === 'concluido';

  const protocoloAlvo = amostraAtual?.identificacao?.protocolo || PROTOCOLO_PADRAO;

  const [aba, setAba] = useState<Aba>(laudoConcluido ? 'homologacao' : 'registro');
  const [dados, setDados] = useState<DadosAnalise>(amostraAtual ?? DADOS_ANALISE_VAZIOS);
  const [versao, setVersao] = useState<number>(1);
  const [statusAmostra, setStatusAmostra] = useState<string>('EM_ANALISE');
  const [amostraInfo, setAmostraInfo] = useState<AmostraMetadata | null>(null);

  const [carregando, setCarregando] = useState<boolean>(true);
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

  // 1. Carregamento inicial da bancada via GET
  const carregarDados = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setStatusSalvamento('idle');
    setErrosProcessamento(null);
    try {
      const res = await analiseService.obterAnalise(protocoloAlvo, token);
      if (res.sucesso && res.dados) {
        setVersao(res.dados.versao);
        setStatusAmostra(res.dados.status);
        setAmostraInfo(res.dados.amostra);

        const bancada = res.dados.dadosBancada;
        const dadosCarregados: DadosAnalise = {
          identificacao: amostraAtual?.identificacao ?? {
            ...DADOS_ANALISE_VAZIOS.identificacao,
            protocolo: protocoloAlvo,
            solicitante: res.dados.amostra?.solicitante ?? '',
            propriedade: res.dados.amostra?.propriedade ?? '',
          },
          quimica: {
            ph: bancada.quimica.ph ?? DADOS_ANALISE_VAZIOS.quimica.ph,
            fosforoAbsBruta: bancada.quimica.fosforoAbsBruta ?? DADOS_ANALISE_VAZIOS.quimica.fosforoAbsBruta,
            sodioMgL: bancada.quimica.sodioMgL ?? DADOS_ANALISE_VAZIOS.quimica.sodioMgL,
            potassioMgL: bancada.quimica.potassioMgL ?? DADOS_ANALISE_VAZIOS.quimica.potassioMgL,
            calcio: {
              medido: bancada.quimica.calcio?.medido ?? DADOS_ANALISE_VAZIOS.quimica.calcio.medido,
              branco: bancada.quimica.calcio?.branco ?? 0,
            },
            magnesio: {
              medido: bancada.quimica.magnesio?.medido ?? DADOS_ANALISE_VAZIOS.quimica.magnesio.medido,
              branco: bancada.quimica.magnesio?.branco ?? 0,
            },
            aluminio: {
              medido: bancada.quimica.aluminio?.medido ?? DADOS_ANALISE_VAZIOS.quimica.aluminio.medido,
              branco: bancada.quimica.aluminio?.branco ?? 0,
            },
            acidezPotencial: {
              medido: bancada.quimica.acidezPotencial?.medido ?? DADOS_ANALISE_VAZIOS.quimica.acidezPotencial.medido,
              branco: bancada.quimica.acidezPotencial?.branco ?? 0,
            },
          },
          granulometria: {
            tfsa: bancada.granulometria.tfsa ?? DADOS_ANALISE_VAZIOS.granulometria.tfsa,
            areiaBecker: bancada.granulometria.areiaBecker ?? DADOS_ANALISE_VAZIOS.granulometria.areiaBecker,
            areiaBeckerVazio: bancada.granulometria.areiaBeckerVazio ?? DADOS_ANALISE_VAZIOS.granulometria.areiaBeckerVazio,
            argilaBecker: bancada.granulometria.argilaBecker ?? DADOS_ANALISE_VAZIOS.granulometria.argilaBecker,
            argilaBeckerVazio: bancada.granulometria.argilaBeckerVazio ?? DADOS_ANALISE_VAZIOS.granulometria.argilaBeckerVazio,
            naohBecker: bancada.granulometria.naohBecker ?? DADOS_ANALISE_VAZIOS.granulometria.naohBecker,
            naohBeckerVazio: bancada.granulometria.naohBeckerVazio ?? DADOS_ANALISE_VAZIOS.granulometria.naohBeckerVazio,
          },
          calibracao:
            // A API devolve a/b/r2 como null enquanto a curva não foi aplicada
            bancada.calibracao?.a != null && bancada.calibracao?.b != null && bancada.calibracao?.r2 != null
              ? {
                  a: bancada.calibracao.a,
                  b: bancada.calibracao.b,
                  r2: bancada.calibracao.r2,
                  pontos: bancada.calibracao.pontos,
                }
              : null,
        };

        setDados(dadosCarregados);
        atualizarAmostraAtual(dadosCarregados);
        ultimoDadosSalvosRef.current = JSON.stringify(dadosCarregados);
      }
    } catch (e) {
      console.error('Erro ao carregar análise de bancada:', e);
    } finally {
      setCarregando(false);
    }
  }, [token, protocoloAlvo, amostraAtual?.identificacao, atualizarAmostraAtual]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // 2. Auto-Save com Debounce (~1500ms)
  // Guarda os dados ainda não enviados para que um rascunho pendente nunca se perca
  // (ex.: o timer é cancelado ao clicar em "Salvar e Processar").
  const pendenteRef = useRef<DadosAnalise | null>(null);

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

        if (res.sucesso && res.dados) {
          setVersao(res.dados.novaVersao);
          setStatusAmostra(res.dados.status);
          setStatusSalvamento('salvo');
          setHorarioSalvo(new Date().toLocaleTimeString('pt-BR'));
          ultimoDadosSalvosRef.current = JSON.stringify(proximo);
        } else {
          setStatusSalvamento('erro');
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          setStatusSalvamento('conflito');
        } else {
          setStatusSalvamento('erro');
        }
      }
    },
    [token, protocoloAlvo],
  );

  function cancelarAutoSave() {
    if (timerDebounceRef.current) {
      clearTimeout(timerDebounceRef.current);
      timerDebounceRef.current = null;
    }
  }

  const dispararAutoSave = useCallback(
    (proximo: DadosAnalise) => {
      if (!token) return;
      cancelarAutoSave();

      // Voltou exatamente ao que já está salvo: nada a enviar
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
      }, 1500);
    },
    [token, salvarRascunhoAgora],
  );

  /** Se havia um rascunho esperando o debounce, envia agora. */
  function enviarRascunhoPendente() {
    const pendente = pendenteRef.current;
    if (pendente) void salvarRascunhoAgora(pendente);
  }

  function handleDadosChange(proximo: DadosAnalise) {
    // Tira o destaque de erro assim que o campo pendente é resolvido
    setErrosCampos((atual) => {
      if (!atual.tfsa && !atual.calibracao) return atual;
      const restante = { ...atual };
      if (proximo.granulometria.tfsa > 0) delete restante.tfsa;
      if (proximo.calibracao?.a) delete restante.calibracao;
      return restante;
    });
    setDados(proximo);
    atualizarAmostraAtual(proximo);
    dispararAutoSave(proximo);
  }

  // 3. Processamento Oficial de Cálculos Agronômicos
  async function handleProcessar() {
    if (!token) return;

    // Segura o auto-save durante o processamento (os dois mexem na versão da análise)
    cancelarAutoSave();

    setErrosProcessamento(null);

    // Validação no front, campo a campo, com as mesmas regras do backend
    const pendentes: ErrosCamposRegistro = {};
    if (!dados.calibracao || !dados.calibracao.a) {
      pendentes.calibracao = 'Aplique a curva de calibração de fósforo antes de processar.';
    }
    if (!(dados.granulometria.tfsa > 0)) {
      pendentes.tfsa = 'Informe o peso da amostra (TFSA) para processar.';
    }
    setErrosCampos(pendentes);
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

      if (res.sucesso && res.dados) {
        setVersao(res.dados.novaVersao);
        setStatusAmostra(res.dados.status);
        setStatusSalvamento('salvo');
        ultimoDadosSalvosRef.current = JSON.stringify(dados);
        pendenteRef.current = null;
        irParaAba('homologacao');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) {
          setStatusSalvamento('conflito');
        } else if (e.erros && e.erros.length > 0) {
          // Erros que o backend associa a um campo viram destaque no próprio campo
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
      // O processamento falhou, então o que foi digitado ainda não foi gravado
      if (!(e instanceof ApiError && e.status === 409)) enviarRascunhoPendente();
    } finally {
      setProcessando(false);
    }
  }

  function irParaAba(proxima: Aba) {
    setAba(proxima);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <Navbar titulo="Módulo do Analista" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <span className="page-header__eyebrow">Laboratório de Solos &middot; Uso interno</span>
            <h1>Gestão de Análises Laboratoriais</h1>
            {(amostraInfo || dados.identificacao.solicitante) && (
              <p>
                {amostraInfo
                  ? `${amostraInfo.solicitante} — ${amostraInfo.propriedade}`
                  : `${dados.identificacao.solicitante} — ${dados.identificacao.propriedade}`}
              </p>
            )}
          </div>
          <Badge variant={statusAmostra === 'AGUARDANDO_HOMOLOGACAO' ? 'status-homologacao' : 'status-processamento'}>
            Amostra: {protocoloAlvo} ({statusAmostra})
          </Badge>
        </div>

        <div className="subnav" role="tablist" aria-label="Etapas do processo laboratorial">
          <button type="button" className="subnav__btn" onClick={() => navigate('/analista')}>
            &larr; Voltar para o Painel do Analista
          </button>
          {aba === 'homologacao' && !laudoConcluido && (
            <button type="button" className="subnav__btn" onClick={() => irParaAba('registro')}>
              &larr; Voltar para Registrar Dados
            </button>
          )}
        </div>

        {carregando ? (
          <div style={{ padding: 'var(--espaco-xl)', textAlign: 'center', color: 'var(--cinza-600)' }}>
            Carregando dados da amostra...
          </div>
        ) : aba === 'registro' ? (
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
            onRecarregar={carregarDados}
          />
        ) : (
          <HomologacaoView
            dados={dados}
            jaLiberado={laudoConcluido}
            onVoltarParaEdicao={() => irParaAba('registro')}
            onLiberarLaudo={concluirAmostraAtual}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
