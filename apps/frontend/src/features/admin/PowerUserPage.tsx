import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { authService } from '@/services/authService';
import { ApiError } from '@/services/apiClient';
import { LinhasVelocidade, SetaVelocidade } from '@/features/home/LayoutEntrada';
import type { AnalistaPrincipalItem } from '@/types/auth';
import '@/styles/painel-minimalista.css';
import '@/features/laudos/analista/AnalistaDashboardPage.css';

export function PowerUserPage() {
  useTituloPagina('Gestão de Analistas · Administração');
  const { session } = useAuth();
  const token = session?.token;

  const [analistas, setAnalistas] = useState<AnalistaPrincipalItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [crea, setCrea] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarAnalistas = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const res = await authService.listarAnalistasPrincipais(token, signal);
        if (res.sucesso) {
          setAnalistas(res.dados);
        }
      } catch (e) {
        if (e instanceof ApiError && e.foiCancelada) return;
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os analistas cadastrados.');
      } finally {
        if (!signal?.aborted) {
          setCarregando(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    const controlador = new AbortController();
    void carregarAnalistas(controlador.signal);
    return () => controlador.abort();
  }, [carregarAnalistas]);

  async function aoCadastrarAnalista(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!nome.trim() || !email.trim() || !crea.trim()) {
      setErro('Preencha o Nome do Analista, a conta Gmail e o número do CREA.');
      return;
    }
    if (!token) return;

    setSalvando(true);
    try {
      const novo = await authService.criarAnalistaPrincipal(
        {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          crea: crea.trim(),
        },
        token,
      );
      setAnalistas((atual) => [novo, ...atual]);
      setNome('');
      setEmail('');
      setCrea('');
      setSucesso(`Analista Principal "${novo.nome}" (${novo.crea}) cadastrado com sucesso.`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro ao cadastrar Analista Principal.');
    } finally {
      setSalvando(false);
    }
  }

  async function aoRemoverAnalista(analista: AnalistaPrincipalItem) {
    if (!token || removendoId === analista.id) return;
    setErro(null);
    setSucesso(null);
    setRemovendoId(analista.id);
    try {
      await authService.removerAnalistaPrincipal(analista.id, token);
      setAnalistas((atual) => atual.filter((item) => item.id !== analista.id));
      setSucesso(`Analista "${analista.nome}" desativado com sucesso.`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro ao desativar Analista Principal.');
    } finally {
      setRemovendoId((atual) => (atual === analista.id ? null : atual));
    }
  }

  return (
    <div className="painel-min">
      <LinhasVelocidade className="painel-min__velocidade" />
      <Navbar titulo="Administração" />
      <main id="conteudo" className="page-container" tabIndex={-1}>
        <div className="page-header">
          <div>
            <span className="page-header__eyebrow">Controle de Acesso &middot; Administração</span>
            <h1>
              <span>Gestão de</span> <span className="painel-min__destaque">Analistas Principais</span>
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader title="Cadastrar Novo Analista Principal" />
          <CardBody>
            <p style={{ marginBottom: '16px', color: 'var(--cinza)', fontSize: '14px' }}>
              Cadastre a conta Google (Gmail) do Analista Principal juntamente com seu Nome e número do CREA que
              constarão na assinatura técnica dos laudos. O Analista Principal terá permissão para gerenciar suas
              próprias contas auxiliares.
            </p>

            {erro && (
              <div className="entrada-alerta" role="alert" style={{ marginBottom: '16px' }}>
                {erro}
              </div>
            )}

            {sucesso && (
              <div
                role="status"
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--verde-escuro)',
                  borderLeft: '2px solid var(--verde)',
                  background: 'rgba(47, 158, 65, 0.08)',
                }}
              >
                {sucesso}
              </div>
            )}

            <form
              onSubmit={aoCadastrarAnalista}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                alignItems: 'end',
              }}
            >
              <div className="entrada-campo">
                <label className="entrada-campo__rotulo" htmlFor="ap-nome">
                  Nome do Analista (Responsável Técnico)
                </label>
                <input
                  id="ap-nome"
                  type="text"
                  placeholder="Ex.: Prof. Msc. Carla Andrade Ferreira"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={salvando}
                  required
                />
              </div>

              <div className="entrada-campo">
                <label className="entrada-campo__rotulo" htmlFor="ap-email">
                  E-mail Google (Gmail)
                </label>
                <input
                  id="ap-email"
                  type="email"
                  placeholder="Ex.: analista@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={salvando}
                  required
                />
              </div>

              <div className="entrada-campo">
                <label className="entrada-campo__rotulo" htmlFor="ap-crea">
                  Número do CREA (para o Laudo)
                </label>
                <input
                  id="ap-crea"
                  type="text"
                  placeholder="Ex.: CREA-PE 123456-D"
                  value={crea}
                  onChange={(e) => setCrea(e.target.value)}
                  disabled={salvando}
                  required
                />
              </div>

              <div>
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Cadastrando...' : 'Autorizar Analista Principal'}
                  <SetaVelocidade />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Analistas Principais Autorizados (${analistas.length})`} />
          <CardBody>
            {carregando ? (
              <div className="dashboard-vazio">
                <p>Carregando analistas...</p>
              </div>
            ) : analistas.length === 0 ? (
              <div className="dashboard-vazio">
                <p>Nenhum Analista Principal cadastrado no momento.</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {analistas.map((analista) => (
                  <div key={analista.id} className="dashboard-bloco">
                    <div className="dashboard-bloco__topo">
                      <strong>{analista.nome}</strong>
                    </div>
                    <p className="dashboard-bloco__solicitante">{analista.email}</p>
                    <p className="dashboard-bloco__propriedade">
                      Registro no Laudo: <strong>{analista.crea}</strong>
                    </p>

                    <div className="dashboard-bloco__badges" style={{ marginTop: '8px' }}>
                      <Badge variant="status-homologacao">Analista Principal</Badge>
                      <Badge variant="status-processamento">
                        {analista.auxiliares.length} {analista.auxiliares.length === 1 ? 'auxiliar' : 'auxiliares'}
                      </Badge>
                    </div>

                    {analista.auxiliares.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--cinza)' }}>
                        <strong>Auxiliares vinculados:</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                          {analista.auxiliares.map((aux) => (
                            <li key={aux.id}>
                              {aux.nome} ({aux.email})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                      <Button
                        variant="ghost"
                        onClick={() => void aoRemoverAnalista(analista)}
                        disabled={removendoId === analista.id}
                      >
                        {removendoId === analista.id ? 'Desativando...' : 'Desativar Acesso'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
