# Contrato da API consumida pelo frontend

Este documento lista o que o frontend (`apps/frontend`) espera da API. A primeira parte descreve os endpoints que já existem no backend e como o front os usa. A segunda parte, **Pendências para o backend**, lista o que falta para o frontend funcionar 100% sem simulações.

Base: `VITE_API_BASE_URL` (padrão em desenvolvimento: `http://localhost:8080/api`; padrão em produção: `/api` no mesmo domínio, via Nginx).

## Convenções gerais

| Item | Esperado pelo front |
| --- | --- |
| Autenticação | `Authorization: Bearer <JWT>` em rotas protegidas. O front lê `exp` do JWT para encerrar a sessão automaticamente. |
| Corpo de erro | `{"detail": {"sucesso": false, "mensagem": "...", "codigoErro": "..."}}` (formato atual do `HTTPException`) ou `{"sucesso": false, "mensagem": "...", "codigoErro": "..."}` (handler global). |
| Erro de validação (422) | Formato padrão do FastAPI: `{"detail": [{"loc": ["body", "campo"], "msg": "..."}]}`. O front mostra `campo: msg`. |
| 401 | Sessão inválida ou expirada. O front limpa a sessão e leva para o login com o aviso "Sua sessão expirou". |
| 403 | Sem permissão. O front mostra mensagem e não tenta de novo. |
| 409 | Conflito de versão (concorrência otimista). O front pede para recarregar. |
| 429 | Limite de requisições. O front mostra "Aguarde um minuto". Hoje o slowapi responde `{"error": "..."}`; o front trata qualquer corpo. |
| 5xx | O front mostra mensagem genérica e **nunca** exibe o texto enviado pelo servidor. |
| Tempo limite | 20 s para JSON e 60 s para arquivos. |
| Datas | ISO 8601 com fuso (`2026-09-01T10:00:00Z`). O front exibe no fuso `America/Recife`. Datas sem hora em `AAAA-MM-DD`. |

## Endpoints já existentes

### `POST /auth/cliente` — consulta do cliente

- Corpo: `{"protocolo": "20101.2306", "cpf": "52998224725"}`. O front já envia o protocolo em maiúsculas e sem espaços e o CPF só com dígitos, validados antes do envio (regex `^[A-Z0-9.-]{8,30}$` e dígitos verificadores).
- 200: `{"sucesso": true, "token": "...", "tipoToken": "Bearer", "laudo": LaudoDetalhe}`.
- 401: dados não conferem (mensagem neutra, como hoje). 422: formato inválido. 429: limite (5/min).
- `LaudoDetalhe`: `protocolo`, `status` (`PENDENTE` | `EM_ANALISE` | `AGUARDANDO_HOMOLOGACAO` | `CONCLUIDO`), `cliente {nome, cpfMascarado}`, `propriedade`, `dataEmissao`, `parametrosSolo {ph, materiaOrganica, fosforo, potassio, dadosAdicionais}`, `temPdfDisponivel`.

### `POST /auth/google` — login do analista

- Corpo: `{"idToken": "<credential do Google>"}`. Em desenvolvimento, com `ENABLE_MOCK_AUTH`, o front envia `mock-dev-token` pelo botão "Entrar como analista de teste".
- 200: `{"sucesso": true, "token": "...", "tipoToken": "Bearer", "usuario": {"nome", "email", "role": "ANALISTA"}}`. 401: conta não autorizada.

### `GET /auth/me`

- Já existe no serviço do front (`authService.sessaoAtual`), ainda não é chamado pelas telas.

### `GET /laudos/{protocolo}/pdf` — PDF do laudo

- Autenticação: Bearer (cliente só do próprio protocolo; analista qualquer um).
- 200: corpo binário com `Content-Type: application/pdf`. O front recusa outro tipo de conteúdo ou arquivo vazio.
- Nome do arquivo: lido de `Content-Disposition` (`filename=` ou `filename*=UTF-8''`). Sem o cabeçalho, o front usa `laudo-<protocolo>.pdf`.
- 404 ou 409: o front mostra "PDF ainda não disponível" com botão "Tentar novamente". 401: encerra a sessão. 403: sem permissão. 429: limite (10/min). 5xx e rede: erro com "Tentar novamente".

### `POST /laudos` — cadastro de amostra

- Corpo (`CriarAmostraPayload`): `protocolo`, `cpf_cliente` (11 dígitos válidos), `cliente_nome`, `propriedade`, `localizacao?`, `areaIdentificacao?`, `areaHectares?`, `profundidadeColeta?`, `cultivo?`, `dataRecebimento` (`AAAA-MM-DD`), `tipoAnalise` (`fisica` | `quimica` | `fisico_quimica`), `culturaExistente`, `email?`, `telefone?` (10 ou 11 dígitos).
- 201: `{"sucesso": true, "mensagem", "dados": {protocolo, cliente_nome, propriedade, status, versao, criadoEm}}`.
- Esperado: 409 quando o protocolo já existe, com mensagem legível.

### `GET /laudos/{protocolo}/analise`, `PATCH /laudos/{protocolo}/analise/rascunho`, `POST /laudos/{protocolo}/analise/processar`

- Usados pela tela `/analista/analises/:protocolo` com concorrência otimista (`versaoEsperada`). 404 mostra "Amostra não encontrada"; 409 mostra "conflito" e oferece recarregar.

## Pendências para o backend

Cada item abaixo já tem o lado do front pronto. Onde há chave de ativação (`VITE_FEATURE_*`), basta ligá-la quando o endpoint existir.

### 1. PDF do laudo (bloqueante para o cliente baixar o laudo)

- Gerar e gravar o PDF ao homologar (hoje o endpoint só serve arquivos já existentes em `storage/<PROTOCOLO>.pdf`, e o laudo de teste não tem arquivo, por isso o front mostra "PDF ainda não disponível").
- `temPdfDisponivel` no `POST /auth/cliente` deve refletir a existência real do arquivo (hoje vem `true` no mock sem arquivo).
- Responder `Content-Type: application/pdf` e `Content-Disposition: attachment; filename="laudo-<PROTOCOLO>.pdf"`.
- **CORS:** incluir `expose_headers=["Content-Disposition"]` no `CORSMiddleware`; sem isso o navegador esconde o nome do arquivo em chamadas entre domínios (o front cai no nome padrão).
- Diferenciar 404 (protocolo sem laudo) de 409 (laudo existe, PDF ainda não gerado), com `codigoErro` `PDF_NAO_GERADO`.
- Enviar `Cache-Control: private, no-store` (documento com dado pessoal).

### 2. Homologação (`VITE_FEATURE_HOMOLOGACAO_SERVIDOR`)

Hoje não existe endpoint: em desenvolvimento a homologação é simulada no navegador e em produção o botão fica desabilitado.

- `POST /laudos/{protocolo}/homologar`, perfil `ANALISTA`, corpo `{"versaoEsperada": number}`.
- 200: `{"sucesso": true, "mensagem", "dados": {"protocolo", "status": "CONCLUIDO", "novaVersao", "homologadoEm", "homologadoPor", "temPdfDisponivel"}}`.
- 409 em conflito de versão; 422 se a análise não foi processada (`status` diferente de `AGUARDANDO_HOMOLOGACAO`).
- Devolver nome e registro profissional (CREA/CRQ) do responsável técnico para o rodapé do laudo. Hoje o front usa o nome do analista logado.

### 3. Listagem de amostras do painel (`VITE_FEATURE_LISTAGEM_SERVIDOR`)

Hoje o painel do analista guarda as amostras só no navegador (localStorage em desenvolvimento e memória em produção), então outro computador ou outro analista não vê as amostras.

- `GET /laudos?pagina=1&tamanhoPagina=100&busca=&situacao=pendentes|concluidas&ordenacao=prazo|recentes|protocolo|solicitante`, perfil `ANALISTA`.
- 200: `{"sucesso": true, "dados": {"itens": [{"protocolo", "solicitante", "propriedade", "status", "dataRecebimento", "prazo", "atualizadoEm"}], "total", "pagina", "tamanhoPagina"}}`.
- Busca sem acento e sem diferenciar maiúsculas (protocolo, solicitante, propriedade e município).
- `prazo` calculado no servidor (hoje o front soma 15 dias à data de recebimento).

### 4. Dados completos da amostra na tela de análise

- `GET /laudos/{protocolo}/analise` devolve só `solicitante`, `propriedade` e `dataColeta`. Para a tela e o laudo ficarem completos sem depender do navegador, incluir: `localizacao`, `areaIdentificacao`, `areaHectares`, `profundidadeColeta`, `cultivo`, `culturaExistente`, `tipoAnalise`, `dataRecebimento`, `prazo`, `email`, `telefone`.

### 5. Consulta do cliente

- Ler o laudo do banco, não de `BASE_LAUDOS_MOCK` em `laudo_service.py`. Hoje as amostras cadastradas pelo analista não podem ser consultadas pelo cliente.
- Para laudos não concluídos, `dataEmissao` deve ser `null` (o front já trata).

### 6. Sessão

- O JWT não tem renovação. Opções: endpoint `POST /auth/renovar` ou expiração mais longa para o analista. O front já encerra a sessão ao expirar e redireciona de volta para a página em que o analista estava, depois do login.
- Logout no servidor (revogação) é opcional; o front apenas descarta o token.

### 7. Fator de correção do NaOH na acidez potencial (H+Al)

A planilha do laboratório calcula H+Al como `(leitura × fator de correção do NaOH) − branco` (célula L28). O front já envia o fator e calcula assim.

- Aceitar `quimica.acidezPotencial.fator` (número > 0, opcional, padrão `1`) no `PATCH .../analise/rascunho` e no `POST .../analise/processar`, gravar na bancada e devolver no `GET .../analise`. Hoje o backend ignora o campo: o rascunho volta com fator 1.
- Usar a mesma fórmula no cálculo oficial do processamento (hoje o backend faz `leitura − branco`). Com fator 1 os dois resultados coincidem.

### 8. Situação do laudo para o cliente

O front centraliza o mapeamento em `src/lib/statusLaudo.ts`. Qualquer valor fora da lista abaixo é tratado como "Situação em atualização" (sem download).

| `status` esperado | O que o cliente vê | Download |
| --- | --- | --- |
| `PENDENTE` | Amostra recebida, análise ainda não iniciada, etapa "Recebida" | não |
| `EM_ANALISE` | Análise em andamento, etapa "Em análise" | não |
| `AGUARDANDO_HOMOLOGACAO` | Aguardando assinatura, etapa "Homologação" | não |
| `CONCLUIDO` | Laudo emitido, etapa "Emitido" | sim, se `temPdfDisponivel` |
| `PENDENCIA` | Pendência na amostra ou nos dados, orienta contato | não |
| `RECOLETA` | Nova coleta solicitada, orienta contato | não |
| `CANCELADO` | Laudo cancelado ou amostra recusada, orienta contato | não |

Sinônimos aceitos: `RECUSADO`, `AMOSTRA_INADEQUADA`, `DADOS_INCONSISTENTES`, `RECOLETA_SOLICITADA`, `AMOSTRA_DEVOLVIDA`, `EMITIDO`, `EM_ANDAMENTO`.

Campos novos no `LaudoDetalhe` (todos opcionais; o front já trata a ausência):

- `dataPrevistaEntrega` (`AAAA-MM-DD` ou ISO): previsão de entrega. Sem o campo, o cliente vê "Previsão de entrega ainda não informada". O front não calcula prazo por conta própria.
- `versao` e `atualizadoEm`: quando `versao > 1`, o cliente vê "Versão atualizada em dd/mm/aaaa" (laudo retificado). O download deve sempre servir a versão mais recente.
- `dataEmissao` deve ser `null` enquanto o laudo não for emitido.
- `propriedade` pode ser `null`; o front mostra "—".

Endpoint novo para atualizar a situação sem pedir o CPF de novo (`VITE_FEATURE_SITUACAO_CLIENTE`):

- `GET /laudos/{protocolo}`, Bearer do cliente (o mesmo token da consulta), resposta `{"sucesso": true, "laudo": LaudoDetalhe}`. Com a chave ligada, o front mostra "Atualizar situação" e consulta a cada 60 s enquanto o laudo está em andamento e a aba está visível.

Possíveis status futuros, ainda não tratados como estados próprios (dependem de regra de negócio): pendência de pagamento ou de documentação, laudo com documento complementar (mais de um PDF), validade ou expiração do laudo.

### 9. Ajustes menores

- `Retry-After` no 429 do download: o front já mostra "Aguarde N segundos" quando o cabeçalho vem (precisa estar em `expose_headers` do CORS).

- `429`: responder no formato padrão (`{"sucesso": false, "mensagem": "...", "codigoErro": "RATE_LIMIT"}`) e com `Retry-After`.
- `CORS` em produção está fixo em `https://laudos.instituto.edu.br`; confirmar o domínio real.

### 10. Ciclo de vida da análise (analista)

- Listagem (`GET /laudos`) deve devolver `status` com `AGUARDANDO_HOMOLOGACAO` separado de `EM_ANALISE`, `atualizadoEm`, `atualizadoPor` e, se possível, `pendencias` (lista de itens que faltam para processar) e contagem por situação, para o painel funcionar com dados do servidor como já funciona com os do navegador.
- Após qualquer `PATCH .../analise/rascunho` numa análise já processada, devolver `status = EM_ANALISE` (o front volta a exigir novo processamento antes de homologar).
- Endpoints ainda inexistentes, com o front sem tela própria por enquanto: retificar laudo emitido (nova versão), reabrir laudo homologado, cancelar ou descartar amostra (com motivo) e registrar recoleta ou pendência.
