# Casos de borda do frontend

Status: **tratado** (no front), **pendente backend** (front pronto ou documentado, depende da API; ver `contrato-api.md`), **fora do escopo** (decisão de produto).

## Geral (todas as telas)

| Caso | Tratamento | Onde | Status |
| --- | --- | --- | --- |
| Rota inexistente | Página 404 com voltar ao início | `features/erros/NaoEncontradoPage.tsx` | tratado |
| Erro de renderização | ErrorBoundary com recarregar; versão nova do site detectada | `components/feedback/ErrorBoundary.tsx` | tratado |
| Sem internet | Aviso fixo global e aviso de reconexão | `components/feedback/AvisoConexao.tsx` | tratado |
| Rota protegida sem sessão | Redireciona ao login e volta para a página de origem | `routes/ProtectedRoute.tsx`, `routes/rotas.ts` | tratado |
| Perfil errado na rota | Redireciona ao login do perfil certo | `routes/ProtectedRoute.tsx` | tratado |
| Token expirado (relógio ou 401) | Encerra a sessão e mostra "Sua sessão expirou" no login | `context/AuthContext.tsx`, `services/apiClient.ts` | tratado |
| Recarregar a página no meio do fluxo | Sessão em `sessionStorage`; tela de análise usa o protocolo da URL | `context/AuthContext.tsx`, `App.tsx` | tratado |
| `sessionStorage`/`localStorage` bloqueado | `try/catch` em toda leitura e escrita | `context/AuthContext.tsx`, `context/AnalistaContext.tsx` | tratado |
| Tempo esgotado, rede, 5xx, 429, resposta não JSON | Mensagens legíveis, sem texto técnico do servidor | `services/apiClient.ts` | tratado |
| Cancelamento ao sair da tela | `AbortController` nas buscas | serviços e páginas | tratado |
| Título da aba | Título por rota | `hooks/useTituloPagina.ts` | tratado |
| Teclado, foco, leitor de tela | Link "pular para o conteúdo", foco em modais, `aria-live` nos avisos | componentes | tratado |
| Movimento reduzido | Animações desligadas | CSS | tratado |
| Fotos e fonte | Locais, sem depender de terceiros | `public/fotos`, `@fontsource/inter` | tratado |

## Consulta do cliente (`/cliente`)

| Caso | Tratamento | Onde | Status |
| --- | --- | --- | --- |
| Campos vazios, protocolo fora do formato, CPF com dígito errado | Validação antes do envio, foco no campo | `lib/documentos.ts`, `ConsultaLaudoPage.tsx` | tratado |
| Protocolo inexistente ou CPF que não confere | Mesma mensagem neutra (não revela qual falhou) | `ConsultaLaudoPage.tsx` | tratado |
| Muitas tentativas (429) | Mensagem de espera, sem botão de repetir | `ConsultaLaudoPage.tsx` | tratado |
| Rede ou servidor fora | Mensagem e "Tentar novamente" | `ConsultaLaudoPage.tsx` | tratado |
| Duplo envio | Botão desabilitado durante a consulta | `ConsultaLaudoPage.tsx` | tratado |

## Laudo do cliente (`/cliente/laudo`)

| Caso | Tratamento | Onde | Status |
| --- | --- | --- | --- |
| Recebido, em análise, aguardando homologação | Aviso, etapas e previsão de entrega, sem download | `lib/statusLaudo.ts`, `LaudoDetalhePage.tsx` | tratado |
| Previsão ausente, vencida, hoje, amanhã | Texto natural; sem prazo inventado | `lib/previsaoEntrega.ts` | tratado (dado: pendente backend) |
| Pendência, recoleta, cancelado/recusado | Orienta contato, sem download | `lib/statusLaudo.ts` | tratado (status: pendente backend) |
| Status desconhecido | "Situação em atualização", sem download | `lib/statusLaudo.ts` | tratado |
| Emitido sem PDF ou 404 no PDF | Mensagem amigável e "Tentar novamente" | `services/laudoService.ts` | tratado (geração do PDF: pendente backend) |
| PDF vazio ou em formato errado, 429 com espera, sem internet | Mensagem específica; botão desligado sem internet | `services/laudoService.ts` | tratado |
| Laudo retificado | "Versão atualizada em dd/mm" | `LaudoDetalhePage.tsx` | tratado (campos: pendente backend) |
| Campos vazios, nomes longos | Travessão; quebra de linha | `LaudoDetalhePage.tsx` | tratado |
| Atualizar situação e atualização automática | Atrás de `VITE_FEATURE_SITUACAO_CLIENTE` | `useSituacaoLaudo.ts` | pendente backend |
| Pagamento pendente, documentos complementares, validade | Só documentado | `contrato-api.md` | fora do escopo |

## Login do analista (`/analista/login`)

| Caso | Tratamento | Onde | Status |
| --- | --- | --- | --- |
| Script do Google não carrega (rede ou bloqueador) | Mensagem e "Tentar carregar novamente" | `hooks/useGoogleIdentity.ts`, `LoginAnalistaPage.tsx` | tratado |
| Popup fechado ou credencial vazia | Ignora sem erro | `hooks/useGoogleIdentity.ts` | tratado |
| Conta não autorizada (401) ou sem perfil (403) | Mensagem específica | `LoginAnalistaPage.tsx` | tratado |
| Já logado | Vai direto ao painel | `LoginAnalistaPage.tsx` | tratado |
| Google não configurado em dev | Botão "Entrar como analista de teste" (mock do backend) | `LoginAnalistaPage.tsx` | tratado |

## Painel do analista (`/analista`)

| Caso | Tratamento | Onde | Status |
| --- | --- | --- | --- |
| Lista vazia, busca sem resultado | Mensagens de estado vazio | `AnalistaDashboardPage.tsx` | tratado |
| Ordenação com prazo vazio | Vai para o fim | `AnalistaDashboardPage.tsx` | tratado |
| Listagem pelo servidor: carregando, erro | Indicador e "Tentar novamente" | `useAmostrasServidor.ts` | pendente backend |
| Protocolo duplicado (409) ou campos inválidos (422) | Mensagem específica no modal | `AnalistaDashboardPage.tsx` | tratado |
| Fechar modal com dados preenchidos | Confirmação antes de descartar | `AnalistaDashboardPage.tsx` | tratado |
| CPF inválido, telefone e e-mail | Validação com mensagem por campo | `NovaAmostraModal.tsx`, `lib/documentos.ts` | tratado |

## Análise e homologação (`/analista/analises/:protocolo`)

| Caso | Tratamento | Onde | Status |
| --- | --- | --- | --- |
| Protocolo inexistente | "Amostra não encontrada" | `AnaliseLaudoPage.tsx` | tratado |
| Erro ao carregar | "Tentar novamente" | `AnaliseLaudoPage.tsx` | tratado |
| Rascunho não salvo (rede) | Mantém os dados, "Tentar salvar novamente" e reenvio automático ao reconectar | `AnaliseLaudoPage.tsx`, `RegistroForm.tsx` | tratado |
| Sair com alterações pendentes | Aviso do navegador; envio do pendente ao sair da tela | `AnaliseLaudoPage.tsx` | tratado |
| Outra pessoa editou (409) | Aviso de conflito com recarregar | `RegistroForm.tsx` | tratado |
| pH fora de 0–14, leitura negativa de Na/K | Bloqueia o processamento | `validacaoAnalise.ts` | tratado |
| Branco maior que a leitura, areia + argila > 100%, peso negativo | Aviso sem bloquear | `validacaoAnalise.ts` | tratado |
| TFSA zero, calibração não aplicada, fator NaOH inválido | Bloqueia com foco no campo | `AnaliseLaudoPage.tsx` | tratado |
| Divisões por zero (Ca/Mg, Ca/K, Mg/K, saturações, fósforo) | Mostra "—", nunca `Infinity`/`NaN` | `calculos.ts`, `HomologacaoView.tsx` | tratado |
| Homologar sem servidor | Desabilitado em produção; simulado em dev | `HomologacaoView.tsx` | pendente backend |
| Confirmação antes de homologar | Modal de confirmação | `HomologacaoView.tsx` | tratado |
| Dados completos da amostra vindos do servidor | Aviso quando faltam | `AnaliseLaudoPage.tsx` | pendente backend |
