# 📜 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

<!--
  As seções a partir da 0.2.9 são geradas pelo release-please ao mergear o PR "chore(main): release X.Y.Z".
  Não edite à mão a versão em andamento. Veja docs/conventions/RELEASES.md.
-->

## [0.2.9](https://github.com/ifpebj-ti/consulta-laudos-solo/compare/consulta-laudos-solo-v0.2.7...consulta-laudos-solo-v0.2.9) (2026-11-26)


### Features

* **frontend:** oculta login local, exibe versao da tag e ajusta textos de desativacao ([61c5031](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/61c5031a028abfb0ab904edc81fd7bde0dd50241))


### Bug Fixes

* **backend:** falhar na inicializacao sem banco e enviar Cross-Origin-Resource-Policy ([2fde4ff](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/2fde4ffa81975c78aa4e6bb59ff55cb97e3b7fb2))
* **backend:** gravar o SQLite em /app/data e nao copiar bancos locais para a imagem ([09aff40](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/09aff40c73fff2a8a3d932cd7d62d08b71eca4e1))
* **backend:** recusar mock auth e JWT padrao em staging e production ([b9f1321](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/b9f132113c72615fc5e01555a8bd113047749605))
* **backend:** restringir CORS a origens configuradas ([e04813b](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/e04813bbdf1b8d1ad6234783d262a23553b64701))
* **frontend:** compilar o frontend na arquitetura do runner no build multi-arch ([d47542e](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/d47542e568f5ebfb491b21d33248acee5cf4663f))
* **frontend:** compilar o frontend na arquitetura do runner no build multi-arch ([e5b49fe](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/e5b49fe29027248fa352146b837b780abdf71eaa))
* **frontend:** corrige status, metadados e amplia testes com cobertura ([6f5428b](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/6f5428b3c951364d277c0b3f87f482887411e93f))
* **frontend:** corrige status, metadados e amplia testes com cobertura ([79036da](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/79036dabe04d931c23e54d1f1dcdfaee647d49e0))

## [0.2.7] - 2026-11-18
*Controle de acesso por perfis e gestão de analistas. Publicada a partir da `develop`, fora do fluxo correto (ver nota abaixo).*

### 🚀 Novidades
- **Backend / Usuários:** modelo de usuário com perfis (Power User, Analista, Auxiliar), login local com hash PBKDF2 e endpoints de gestão de analistas e auxiliares. A lista fixa de e-mails autorizados foi removida.
- **Backend / Laudos:** listagem de laudos com escopo por analista e novos metadados da amostra.
- **Frontend:** login local do Power User, gestão de analistas e de auxiliares, sincronização das amostras com o servidor e isolamento do cache por analista.
- **Frontend / Laudo:** nome e CREA do responsável técnico exibidos no rodapé do laudo.

### 🐛 Correções
- **Frontend:** validação das respostas da API, tratamento de PDF corrompido, HTTP 412 e `Retry-After`.

---

## Nota sobre as versões 0.2.6, 0.2.7 e 0.2.8

Essas versões foram fechadas fora do fluxo definido: as tags `v0.2.6` e `v0.2.7` apontam para commits da `develop`, e a `v0.2.8` nunca foi publicada (o PR da `release/v0.2.8` foi substituído). O conteúdo da 0.2.8 (esteira de CI/CD, cobertura de testes, E2E e governança) é entregue na **0.2.9**, a primeira versão no fluxo `develop → release/* → main → tag`. As tags antigas foram mantidas para não quebrar quem já usa essas imagens.

---
## [0.2.6] - 2026-11-11
*Revisão completa do frontend, testes automatizados e atualização de dependências.*

### 🚀 Novidades
- **Frontend / Base:** Cliente HTTP robusto, sessão com expiração, rotas protegidas por perfil, página 404, tela de erro e aviso de conexão. (PR #67)
- **Frontend / Cliente:** Laudo com dados em destaque, estados da situação e download real do PDF. (PR #67)
- **Frontend / Analista:** Na/K em cmolc/dm³, H+Al com fator NaOH, classe textural pelo triângulo do SBCS e situações da análise. (PR #67)
- **Frontend / Qualidade:** ESLint, Vitest e Testing Library adicionados ao projeto. (PR #67)

### 🔒 Segurança
- **Backend:** Atualização de dependências vulneráveis (`cryptography`, `google-auth`, `httpx`, `pytest`, `hypothesis`). (PR #68)
- **Infra/Docker:** Porta 8080 no frontend, cabeçalhos de segurança e cache no Nginx. (PR #67)

---
## [0.2.5] - 2026-11-04
*Melhorias de design, correção de bugs de login e aprimoramentos no painel do analista.*

### 🚀 Novidades
- **Backend / Autenticação:** Inclusão de novos e-mails de desenvolvedores (`glos@`, `gscb@`) na lista de permissões (`ANALISTAS_AUTORIZADOS`) para acesso à página de administração via Google Auth. (PR #65)
- **Frontend / Analista:** Inclusão de novos campos de amostra no cadastro e exibição. (PR #64)
- **Frontend / Analista:** Implementação de busca, ordenação e paginação na lista de amostras. (PR #64)
- **Frontend / Analista:** Reorganização do cabeçalho da análise, destacando o cliente/solicitante. (PR #64)
- **Backend / Laudos:** Adicionadas validações rigorosas para campos de recebimento, tipo de análise e cultura. (PR #64)

### 🔄 Alterações
- **Frontend / Design:** Refatoração global do design visual (Minimalista). Aplicação de paleta de cores única, fonte Inter local, grade de 8px e foco visível em verde. Componentes base (`Button`, `Modal`, `Card`, etc.) e layouts padronizados, reduzindo o tamanho do CSS em build. (PR #63)

---

## [0.2.4] - 2026-10-19
*Correções de pipeline e build de imagem.*

### 🐛 Correções
- **Infra/Docker:** Correção na coleta de variáveis do Vite (`VITE_*`) durante o build da imagem do frontend para compilação correta com chave de login Google. (PR #58, #59)

---

## [0.2.3] - 2026-10-07
*Correções de ambiente containerizado.*

### 🐛 Correções
- **Infra/Docker:** Resolvido o conflito de portas (80 vs 8080) entre a aplicação Frontend e o proxy NGINX na inicialização do container. (PR #55, #56)

---

## [0.2.2] - 2026-09-29
*Atualizações de infraestrutura, segurança e bibliotecas base.*

### 🔒 Segurança
- **Backend:** Saneamento da manipulação de caminhos de arquivos PDF para mitigar vulnerabilidades de *Path Traversal / Path Injection* reportadas pelo CodeQL. (PR #42)
- **CI/CD:** Correção de vulnerabilidades apontadas pelo Trivy referentes à falta de definição de escopo no pipeline. (PR #46)

### 🐛 Correções
- **Deploy:** Correção do apontamento da pasta de módulos do Terraform. (PR #37, #38)
- **CI/CD:** Correção no fluxo de build e publicação da imagem no GitHub Container Registry (GHCR). (PR #36)

### ⚙️ Manutenção
- **Infraestrutura/AWS:** Alteração do tipo de instância EC2 para enquadramento no modelo *Free Tier*, visto que o suporte à instância anterior foi descontinuado. (PR #39, #40, #41)
- **CI/CD:** Revisão e manutenção da esteira, incluindo módulos HCL (Terraform), adição do job de deploy via GitHub Actions e remoção do deploy direto pela EC2. (PR #31)
- **Dependências / Frontend:** Atualização majoritária do `vite` para `8.3.1` e do `@vitejs/plugin-react` para `6.1.1` (requerido para compatibilidade). (PR #34, #44, #45)
- **Dependências / Frontend:** Atualização do pacote `react-router` e `react-router-dom` para a versão `7.18.4`. (PR #32)

---

## [0.2.0] - 2026-09-26
*Integração final entre frontend, backend e rotinas laboratoriais.*

### 🚀 Novidades
- **Frontend / Portal do Cliente:** Interface para consulta de laudos utilizando Protocolo e CPF. Exibição de detalhes da amostra e integração com download do PDF gerado. (PR #23)
- **Frontend / Portal do Analista:** Criação do painel de administração (`/analista`) com fluxo completo de registro de análises (Química e Granulometria), controle de status e histórico. (PR #27)
- **Frontend / Rotina Laboratorial:** Funcionalidade de calibração iterativa de Fósforo (regressão linear de 5 pontos com gráfico em tempo real). Cálculos automáticos do Complexo Sortivo/CTC baseados nos fatores de conversão oficiais do laboratório. (PR #23)
- **Backend / Rotinas:** Módulo completo de backend para receber análises, suportar endpoints do analista e validar dados de entrada. (PR #28)
- **Autenticação:** Implementação real de autenticação OAuth via Google Identity Services (`/api/auth/google`) e autorização baseada em tokens de sessão. (PR #20, #23)

### ⚙️ Manutenção
- **CI/CD:** Implementação de análise de segurança estática (SAST) e correções no deploy automático (Continuous Deployment) para o ambiente AWS. (PR #25)
- **Dependências:** Adição do `Dependabot` para escaneamento e atualização automática de pacotes dos ecossistemas `npm` e `pip`. (PR #22, #24)

---

## [0.1.0] - 2026-09-23
*Configurações iniciais, arquitetura e fundação do projeto.*

### 🚀 Novidades
- **Arquitetura:** Definição da estrutura inicial em `monorepo` contemplando `apps/frontend` e `apps/backend`. (PR #1)
- **Backend:** Configuração da aplicação Python + Uvicorn utilizando FastAPI. (PR #1, #19)
- **Frontend:** Inicialização da aplicação React com Vite e TypeScript. (PR #1)
- **Infraestrutura:** Inclusão das rotinas de GitHub Actions e configuração da infraestrutura base como código (IaC) utilizando Terraform (HCL). (PR #1)

[0.2.7]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.0...v0.2.2
[0.2.0]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ifpebj-ti/consulta-laudos-solo/releases/tag/v0.1.0
