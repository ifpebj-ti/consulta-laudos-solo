# Casos de uso do frontend

Status: **coberto** (funciona no front), **parcial** (front pronto, mas depende de algo), **depende do backend** (front preparado, falta endpoint ou dado), **falta** (não existe ainda).

## Cliente

| Caso de uso | Fluxo e estados | Onde | Status |
| --- | --- | --- | --- |
| Consultar laudo | Protocolo + CPF validados; dados não conferem dá mensagem neutra; rede/servidor com "Tentar novamente"; 429 com espera | `ConsultaLaudoPage.tsx` | coberto |
| Ver situação | Recebida, em análise, aguardando homologação, emitido, pendência, recoleta, cancelado e desconhecido, com etapas e previsão de entrega | `lib/statusLaudo.ts`, `LaudoDetalhePage.tsx` | coberto (status e previsão: depende do backend) |
| Baixar PDF | Só quando emitido e com PDF; 404, rede, formato inválido, sem internet | `services/laudoService.ts` | parcial: o backend ainda não gera o PDF |
| Atualizar situação sem consultar de novo | Botão e atualização a cada 60 s atrás de chave | `useSituacaoLaudo.ts` | depende do backend |
| Sair / sessão expirada | Volta para a consulta com aviso | `AuthContext.tsx` | coberto |

## Analista

| Caso de uso | Fluxo e estados | Onde | Status |
| --- | --- | --- | --- |
| Entrar com Google | Script não carrega, conta sem acesso (403), já logado, volta para a página de origem | `LoginAnalistaPage.tsx`, `useGoogleIdentity.ts` | coberto |
| Ver painel | Resumo por situação com contagem e filtro (não iniciadas, em andamento, aguardando homologação); busca, ordenação e "limpar filtros" | `AnalistaDashboardPage.tsx` | coberto (lista só local até existir listagem no servidor) |
| Ver o que falta em cada amostra | Cartão mostra "Ainda não terminou: falta …", "Cálculos processados. Falta homologar." e a última edição | `AnalistaDashboardPage.tsx`, `validacaoAnalise.ts` | coberto (apenas amostras do navegador) |
| Criar nova amostra | Validação por campo; protocolo duplicado (409); dados inválidos (422); confirmação ao descartar | `NovaAmostraModal.tsx`, `AnalistaDashboardPage.tsx` | coberto |
| Abrir / retomar amostra | Endereço com o protocolo; amostra inexistente; erro com tentar novamente | `AnaliseLaudoPage.tsx` | coberto |
| Registrar análise e salvar rascunho | Salvamento automático; falha com "tentar salvar novamente"; reenvio ao reconectar; aviso ao sair com pendências | `AnaliseLaudoPage.tsx`, `RegistroForm.tsx` | coberto |
| Saber se a análise terminou | Aviso no topo: "Análise em andamento: ainda não terminou", com o que falta e os campos ainda sem valor; "Pronta para processar" quando não falta nada | `AnaliseLaudoPage.tsx` | coberto |
| Processar cálculos | Bloqueia sem calibração, sem TFSA, com fator NaOH ou pH inválidos, com foco no campo | `AnaliseLaudoPage.tsx`, `validacaoAnalise.ts` | coberto |
| Alterar depois de processar | Aviso para processar de novo; homologação volta a ficar bloqueada | `AnaliseLaudoPage.tsx`, `HomologacaoView.tsx` | coberto |
| Homologar / emitir | Só depois de processar; confirmação; conflito de versão | `HomologacaoView.tsx` | parcial: depende do backend (simulado em dev) |
| Vários analistas na mesma amostra | Conflito de versão (409) com recarregar | `RegistroForm.tsx` | coberto |
| Trabalhar sem internet | Aviso global; rascunho guardado e reenviado | `AvisoConexao.tsx`, `AnaliseLaudoPage.tsx` | coberto |
| Retificar laudo emitido | — | — | depende do backend |
| Reabrir laudo homologado | — | — | depende do backend |
| Cancelar / descartar amostra | — | — | depende do backend |
| Registrar recoleta ou pendência | Cliente já vê esses status | — | depende do backend |
| Sair | Botão "Sair" na barra | `Navbar.tsx` | coberto |

## Ciclo de vida da análise (como cada estado aparece)

| Estado | Painel | Tela da análise |
| --- | --- | --- |
| Rascunho vazio (recém-criada) | Selo "Não iniciado" + o que falta | "Ainda não terminou" + o que falta |
| Em preenchimento | Selo "Em andamento" + o que falta + última edição | Mesmo aviso, atualizado a cada alteração |
| Pronta para processar | Selo "Em andamento", sem pendências | "Pronta para processar" |
| Processada, não homologada | Selo "Aguardando homologação" + "Falta homologar" | Aba de homologação liberada |
| Homologada | Vai para o histórico, selo "Concluído" | Laudo somente leitura |
| Homologada, PDF pendente | — | Cliente vê "o PDF está sendo preparado" (depende do backend) |
| Retificada, cancelada | — | Depende do backend |
