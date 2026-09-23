import { useCallback, useEffect, useRef, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { analiseService, type AmostraMetadata } from '@/services/analiseService';
import { ApiError } from '@/services/apiClient';
import { RegistroForm } from './RegistroForm';
import { HomologacaoView } from './HomologacaoView';
import { DADOS_ANALISE_INICIAIS, type DadosAnalise } from './tipos';
import './AnaliseLaudoPage.css';

type Aba = 'registro' | 'homologacao';
type StatusSalvamento = 'salvo' | 'salvando' | 'erro' | 'conflito' | 'idle';

const PROTOCOLO_PADRAO = 'LAB-2026-0142';

export function AnaliseLaudoPage() {
  const { session } = useAuth();
  const token = session?.token;

  const [aba, setAba] = useState<Aba>('registro');
  const [dados, setDados] = useState<DadosAnalise>(DADOS_ANALISE_INICIAIS);
  const [versao, setVersao] = useState<number>(1);
  const [statusAmostra, setStatusAmostra] = useState<string>('EM_ANALISE');
  const [amostraInfo, setAmostraInfo] = useState<AmostraMetadata | null>(null);

  const [carregando, setCarregando] = useState<boolean>(true);
  const [processando, setProcessando] = useState<boolean>(false);
  const [statusSalvamento, setStatusSalvamento] = useState<StatusSalvamento>('idle');
  const [horarioSalvo, setHorarioSalvo] = useState<string | null>(null);
  const [errosProcessamento, setErrosProcessamento] = useState<string[] | null>(null);

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
      const res = await analiseService.obterAnalise(PROTOCOLO_PADRAO, token);
      if (res.sucesso && res.dados) {
        setVersao(res.dados.versao);
        setStatusAmostra(res.dados.status);
        setAmostraInfo(res.dados.amostra);

        const bancada = res.dados.dadosBancada;
        const dadosCarregados: DadosAnalise = {
          quimica: {
            ph: bancada.quimica.ph ?? DADOS_ANALISE_INICIAIS.quimica.ph,
            fosforoAbsBruta: bancada.quimica.fosforoAbsBruta ?? DADOS_ANALISE_INICIAIS.quimica.fosforoAbsBruta,
            sodioMgL: bancada.quimica.sodioMgL ?? DADOS_ANALISE_INICIAIS.quimica.sodioMgL,
            potassioMgL: bancada.quimica.potassioMgL ?? DADOS_ANALISE_INICIAIS.quimica.potassioMgL,
            calcio: {
              medido: bancada.quimica.calcio?.medido ?? DADOS_ANALISE_INICIAIS.quimica.calcio.medido,
              branco: bancada.quimica.calcio?.branco ?? 0,
            },
            magnesio: {
              medido: bancada.quimica.magnesio?.medido ?? DADOS_ANALISE_INICIAIS.quimica.magnesio.medido,
              branco: bancada.quimica.magnesio?.branco ?? 0,
            },
            aluminio: {
              medido: bancada.quimica.aluminio?.medido ?? DADOS_ANALISE_INICIAIS.quimica.aluminio.medido,
              branco: bancada.quimica.aluminio?.branco ?? 0,
            },
            acidezPotencial: {
              medido: bancada.quimica.acidezPotencial?.medido ?? DADOS_ANALISE_INICIAIS.quimica.acidezPotencial.medido,
              branco: bancada.quimica.acidezPotencial?.branco ?? 0,
            },
          },
          granulometria: {
            tfsa: bancada.granulometria.tfsa ?? DADOS_ANALISE_INICIAIS.granulometria.tfsa,
            areiaBecker: bancada.granulometria.areiaBecker ?? DADOS_ANALISE_INICIAIS.granulometria.areiaBecker,
            areiaBeckerVazio: bancada.granulometria.areiaBeckerVazio ?? DADOS_ANALISE_INICIAIS.granulometria.areiaBeckerVazio,
            argilaBecker: bancada.granulometria.argilaBecker ?? DADOS_ANALISE_INICIAIS.granulometria.argilaBecker,
            argilaBeckerVazio: bancada.granulometria.argilaBeckerVazio ?? DADOS_ANALISE_INICIAIS.granulometria.argilaBeckerVazio,
            naohBecker: bancada.granulometria.naohBecker ?? DADOS_ANALISE_INICIAIS.granulometria.naohBecker,
            naohBeckerVazio: bancada.granulometria.naohBeckerVazio ?? DADOS_ANALISE_INICIAIS.granulometria.naohBeckerVazio,
          },
          calibracao: bancada.calibracao?.a !== undefined && bancada.calibracao?.b !== undefined && bancada.calibracao?.r2 !== undefined
            ? {
                a: bancada.calibracao.a,
                b: bancada.calibracao.b,
                r2: bancada.calibracao.r2,
                pontos: bancada.calibracao.pontos,
              }
            : null,
        };

        setDados(dadosCarregados);
        ultimoDadosSalvosRef.current = JSON.stringify(dadosCarregados);
      }
    } catch (e) {
      console.error('Erro ao carregar análise de bancada:', e);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // 2. Disparo do Auto-Save com Debounce (~1500ms)
  const dispararAutoSave = useCallback(
    (proximo: DadosAnalise) => {
      if (!token) return;

      const serializado = JSON.stringify(proximo);
      if (serializado === ultimoDadosSalvosRef.current) return;

      if (timerDebounceRef.current) {
        clearTimeout(timerDebounceRef.current);
      }

      setStatusSalvamento('salvando');

      timerDebounceRef.current = setTimeout(async () => {
        try {
          const res = await analiseService.salvarRascunho(
            PROTOCOLO_PADRAO,
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
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            setStatusSalvamento('conflito');
          } else {
            setStatusSalvamento('erro');
          }
        }
      }, 1500);
    },
    [token],
  );

  function handleDadosChange(proximo: DadosAnalise) {
    setDados(proximo);
    dispararAutoSave(proximo);
  }

  // 3. Processamento Oficial de Cálculos Agronômicos
  async function handleProcessar() {
    if (!token) return;

    if (timerDebounceRef.current) {
      clearTimeout(timerDebounceRef.current);
    }

    setProcessando(true);
    setErrosProcessamento(null);

    // Validação preventiva de calibração no front
    if (!dados.calibracao || dados.calibracao.a === 0) {
      setErrosProcessamento([
        'A curva de calibração de fósforo deve ser calculada e aplicada antes do processamento.',
      ]);
      setProcessando(false);
      return;
    }

    try {
      const res = await analiseService.processarAnalise(
        PROTOCOLO_PADRAO,
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
        irParaAba('homologacao');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) {
          setStatusSalvamento('conflito');
        } else if (e.erros && e.erros.length > 0) {
          setErrosProcessamento(e.erros);
        } else {
          setErrosProcessamento([e.message]);
        }
      } else {
        setErrosProcessamento(['Ocorreu um erro inesperado ao processar os cálculos agronômicos.']);
      }
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
            <p>
              {amostraInfo
                ? `${amostraInfo.solicitante} — ${amostraInfo.propriedade}`
                : 'Registro de dados de bancada, cálculos automáticos e homologação de laudos técnicos.'}
            </p>
          </div>
          <Badge variant={statusAmostra === 'AGUARDANDO_HOMOLOGACAO' ? 'status-homologacao' : 'status-processamento'}>
            Amostra: {PROTOCOLO_PADRAO} ({statusAmostra})
          </Badge>
        </div>

        <div className="subnav" role="tablist" aria-label="Etapas do processo laboratorial">
          <button
            type="button"
            className={`subnav__btn ${aba === 'registro' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={aba === 'registro'}
            onClick={() => irParaAba('registro')}
          >
            Registrar Dados da Análise
          </button>
          <button
            type="button"
            className={`subnav__btn ${aba === 'homologacao' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={aba === 'homologacao'}
            onClick={() => irParaAba('homologacao')}
          >
            Homologar Laudo
          </button>
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
            onRecarregar={carregarDados}
          />
        ) : (
          <HomologacaoView dados={dados} onVoltarParaEdicao={() => irParaAba('registro')} />
        )}
      </main>
      <Footer />
    </>
  );
}
