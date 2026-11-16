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
| 409 / 412 | Conflito de versão (concorrência otimista). O front trata os dois como conflito e pede para recarregar. |
| 429 | Limite de requisições. Com `Retry-After` (segundos ou data HTTP) o front mostra "Aguarde N segundos"; sem ele, "Aguarde um minuto". Hoje o slowapi responde `{"error": "..."}`; o front trata qualquer corpo. |
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
- 200: corpo binário com `Content-Type: application/pdf`. O front recusa outro tipo de conteúdo, arquivo vazio ou arquivo sem a assinatura `%PDF` no início (por exemplo, página HTML de erro servida como PDF).
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

- `GET /laudos?pagina=1&tamanhoPagina=100&busca=&situacao=pendentes|concluidas&status=PENDENTE|EM_ANALISE|AGUARDANDO_HOMOLOGACAO&ordenacao=prazo|recentes|antigos|protocolo|solicitante`, perfil `ANALISTA`.
- 200: `{"sucesso": true, "dados": {"itens": [{"protocolo", "solicitante", "propriedade", "status", "dataRecebimento", "prazo", "atualizadoEm"}], "total", "pagina", "tamanhoPagina"}}`.
- Paginação (o front já está pronto e testado com 1000 amostras no back temporário):
  - O front pede páginas de 100 (`pagina` começa em 1). Cada seção do painel (pendentes e histórico) faz a sua consulta, com `situacao` própria.
  - Busca, filtro de situação (`status`) e ordenação vão para o servidor e voltam para a página 1. A busca espera 350 ms depois da digitação.
  - Com `total` (número de itens que atendem aos filtros, não só os da página), o front mostra "Amostras 1–100 de N · lote 1 de M" com botões para os 100 anteriores e os próximos 100.
  - Sem `total`, o front cai para "Carregar mais": pede a próxima página e para quando vier uma página com menos de `tamanhoPagina` itens ou vazia.
  - Página além do fim (por exemplo, o total diminuiu entre duas consultas) deve responder 200 com `itens: []` e o `total` atual; o front vai para a última página válida.
  - A ordenação precisa ser estável (desempate por protocolo) para nenhum item se repetir ou sumir entre páginas. Se o volume crescer muito, trocar `pagina` por cursor (`depois=<protocolo>`) mantendo o mesmo formato de resposta.
  - Erros por página não apagam a página anterior; o front mostra o aviso com "Tentar novamente".
  - A contagem por situação nos filtros só aparece com a lista local. Para mostrar com o servidor, enviar `contagem: {"PENDENTE": n, "EM_ANALISE": n, "AGUARDANDO_HOMOLOGACAO": n}` em `dados`.
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

### 11. Validação das respostas (resultado dos testes de integração)

O front foi testado contra uma API simulada em 143 cenários (sucesso, campos nulos e com tipo errado, 4xx, 5xx, HTML no lugar de JSON, timeout, conexão derrubada, CORS, offline, token expirado). Para não quebrar a tela, o front agora valida estas respostas e trata o que vier fora do formato como "O servidor enviou uma resposta inválida":

- `POST /auth/cliente`: precisa de `token` (string não vazia) e `laudo` com `protocolo`. Campos de texto com número são convertidos; objetos ou tipos errados viram vazio (`—`); `temPdfDisponivel` só é verdadeiro com o booleano `true` (a string `"true"` não vale).
- `POST /auth/google`: precisa de `token`; `usuario` é opcional.
- `GET /laudos/{protocolo}`: precisa de `laudo` com `protocolo`. Resposta sem `laudo` não apaga mais o laudo da tela.
- `GET /laudos/{protocolo}/analise`: números enviados como texto (`"6.5"` ou `"6,5"`) são convertidos; `dadosBancada` nulo abre o formulário vazio; calibração incompleta é ignorada; `versao` ausente vira 1.

Pedidos ao backend que saíram dos testes:

- Enviar sempre os tipos do contrato (números como número, `temPdfDisponivel` como booleano, datas ISO 8601). Datas inválidas aparecem como `—` para o cliente.
- Quando o laudo for emitido sem o PDF pronto, devolver `status = CONCLUIDO` e `temPdfDisponivel = false`. O front continua consultando a cada 60 s (com `VITE_FEATURE_SITUACAO_CLIENTE`) e libera o botão com o aviso "O PDF do laudo foi liberado" assim que vier `true`.
- Nunca enviar stack trace ou detalhe interno no corpo de erro 5xx (o front já não exibe, mas o corpo fica visível na rede).
- `Retry-After` no 429 de qualquer rota, exposto no CORS (`expose_headers=["Retry-After", "Content-Disposition"]`).
- Conflito de versão pode vir como 409 ou 412; o front trata os dois.

### 12. Segurança (resultado da bateria de segurança)

O front foi testado no navegador, no build de produção e com os cabeçalhos do `nginx.conf`: rotas por perfil, token forjado, expirado e sem `exp`, perfil adulterado no storage, logout em abas, voltar do navegador, open redirect, XSS em rotas e em textos do back, vazamento de dados, clickjacking, CSP e bundle. O que é do front já está tratado; a proteção real depende do backend:

- **Autorização por perfil no servidor.** O front esconde rotas, mas quem decide é o back. Já funciona: token de cliente em rota de analista → 403; cliente de outro protocolo no PDF → 403; token forjado ou sem `exp` → 401. Manter em todas as rotas novas (listagem, situação, homologação).
- **Texto sem `html.escape` na gravação.** Hoje `POST /laudos` grava `cliente_nome` e `propriedade` escapados, e o cliente vê `Sítio D&#x27;Água &amp; Cia`. O React já escapa na tela: o back deve gravar o texto original e só validar tamanho e caracteres.
- **JWT do cliente sem CPF.** O `sub` do token do cliente é o CPF completo, legível por quem tiver o token (fica no `sessionStorage`). Usar um identificador opaco (por exemplo o id do laudo) e manter o CPF só no servidor.
- **JWT curto com renovação.** Cliente 2 h e analista 8 h sem renovação. Sugestão: 15 a 30 min com refresh token em cookie `HttpOnly; Secure; SameSite=Strict` e revogação por `jti` no logout. O front encerra a sessão ao expirar e sincroniza o logout entre abas da mesma sessão.
- **Limite de tentativas.** O front aplica espera progressiva depois de 3 consultas sem sucesso (5 s, 10 s, 20 s… até 5 min, por aba), mas isso só reduz o abuso casual. A proteção real é o limite por IP e por protocolo no back (hoje 5/min por IP no `POST /auth/cliente`), com `Retry-After` e bloqueio temporário por protocolo depois de várias falhas.
- **Não revelar existência de protocolo.** A mensagem e o tempo de resposta já são iguais para protocolo inexistente e CPF errado (diferença média abaixo de 10 ms no teste). Manter o `compare_digest` e a mensagem única.
- **Logs de auditoria.** Registrar login, consulta com falha, download de PDF, homologação e conflito de versão, com usuário, IP e protocolo, sem gravar CPF ou token.
- **CORS restrito.** Em produção, só o domínio real (hoje fixo em `https://laudos.instituto.edu.br`; confirmar). Em dev, `*` com `allow_credentials=True` não é aceito pelos navegadores para credenciais; preferir a lista de origens locais.
- **Validação do token do Google só no back.** O front nunca decide autorização por e-mail; o texto "@ifpe.edu.br" na tela é só orientação. Manter a verificação de `aud`, `iss`, `email_verified` e a lista de analistas no servidor, e tirar `ENABLE_MOCK_AUTH` e os e-mails fixos do código antes de produção.
- **Cabeçalhos da API.** Enviar `Cache-Control: no-store` em todas as respostas com dado pessoal (hoje não envia) e `Content-Disposition` com nome seguro no PDF.
- **Dados de exemplo inconsistentes.** `20101.2306` aparece como `CONCLUIDO` no laudo fixo em código e como `PENDENTE` no banco de exemplo.

Cabeçalhos do front (`apps/frontend/nginx.conf`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (só tem efeito atrás de HTTPS) e CSP com `frame-ancestors 'none'`. A CSP ainda está em `Report-Only`. No teste com a CSP bloqueante, nenhuma página teve violação, inclusive o login com o script do Google. Antes de trocar para `Content-Security-Policy`, fazer um login real com o Google em homologação (com a origem autorizada no console do Google), porque o botão só aparece completo nesse caso.

### 13. Sessão no navegador

- O token fica só no `sessionStorage` da aba, nunca em cookie ou `localStorage`.
- O front confere se o token ainda está no storage antes de cada chamada autenticada e quando a aba volta a ter foco. Se o token foi apagado ou trocado, a sessão é encerrada na hora com "Sua sessão foi encerrada" e nenhuma chamada sai com o token antigo.
- Depois do logout, nenhuma chamada autenticada é enviada. Isso inclui o rascunho pendente da tela de análise: ele é descartado; em desenvolvimento, fica guardado localmente por analista. Para não perder o rascunho, o back pode oferecer o salvamento antes do logout (o front já salva a cada 1,5 s de pausa na digitação).
- Revogar o token no servidor no logout (lista de `jti` revogados) fecha a janela em que um token copiado ainda funciona.

### 14. Divergências de cálculo entre front e back

Comparação automática de 20.001 entradas (20.000 aleatórias e extremas mais a amostra 26063.2808 da planilha "Analise dos Dados"). O front roda o `calculos.ts` e o back roda o `calculos_service.py` copiado sem alteração. Tolerância: 1e-9 relativa (bem abaixo das 2 casas do laudo). Script e resultados: `labon-teste-integracao/calculos/comparar.mjs`.

Iguais nos dois lados e iguais à planilha: Na÷230, K÷391, Ca, Mg, Al líquidos, SB, T, t, V%, m%, Ca/Mg, Ca/K, Mg/K, Ca/T, Mg/T, H+Al/T (com fator do NaOH = 1), pesos e % de areia, silte e argila, e a regressão da curva de calibração.

Divergências (o back precisa corrigir; o front segue a planilha):

1. **Fator de diluição do fósforo.** A planilha usa `P = ((leitura + 0,0074) / 0,2899) × 10 × Fator Dil.` (K10 e M10, com Fator Dil. = 10 na L10). O back fixa `fator_diluicao=1.0` no `processar`. Exemplo: leitura 0,292 → planilha e front 103,28 mg/dm³; back 10,33. O front agora envia `quimica.fatorDiluicaoFosforo` (número > 0, padrão 10) no rascunho e no processar; o back deve gravar, devolver no `GET .../analise` e usar na fórmula.
2. **Fator de correção do NaOH no H+Al.** A planilha usa `(leitura × fator) − branco` (L28). O back faz `leitura − branco` e ignora `acidezPotencial.fator`. Com fator diferente de 1, todas as entradas divergem em H+Al, T, V%, Ca/T, Mg/T e H+Al/T. Exemplo: leitura 6,9391, branco 2,9233, fator 0,9671 → front 3,7875; back 4,0158.
3. **Classe textural.** O back usa regras próprias, com faixas que se sobrepõem e "Franco" como resposta quando nenhuma serve. O front segue o triângulo textural (SBCS/USDA). Com frações válidas, 2.416 de 20.000 amostras (12%) saem com classe diferente. Exemplos, todos conferidos no triângulo:
   - areia 75,8 / silte 12,4 / argila 11,8: triângulo e front **Franco Arenoso**; back Areia Franca;
   - 86,5 / 5,4 / 8,1: **Areia Franca**; back Areia;
   - 47,2 / 44,4 / 8,4: **Franco**; back Franco Arenoso;
   - 1,5 / 87,0 / 11,6: **Silte**; back Franco Siltoso;
   - 6,2 / 65,8 / 27,9: **Franco Argilo Siltoso**; back Franco Siltoso.
4. **Frações inválidas.** Quando areia + argila passa de 100% (silte negativo), o back ainda devolve uma classe (por exemplo "Franco" para 51,0 / −17,3 / 66,3). O front não classifica e avisa o analista; o back deveria recusar o processamento (422) ou devolver a classe vazia.

A amostra 26063.2808 da planilha confere em todos os valores no front (inclusive P = 103,28 e "Argilo arenoso"). No back confere tudo, menos o fósforo.
