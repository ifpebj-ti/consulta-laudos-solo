# 📜 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### 🔒 Segurança e CI/CD
- Esteira reescrita: scan Trivy antes do push (falha em CRITICAL/HIGH com correção), Semgrep e OWASP ZAP bloqueantes, SARIF enviado ao Code Scanning, build multi-arch (amd64/arm64) também no frontend e SBOM/provenance nas imagens.
- Imagens do GHCR com tags `latest`, `sha-<commit>` e de versão (`X.Y.Z`, `vX.Y.Z`, `X.Y`); `docker-compose.prod.yml` passa a exigir `APP_VERSION`.
- release-please configurado (manifest + config) e executado somente na `main`.
- Backend: `ENABLE_MOCK_AUTH` e a `JWT_SECRET_KEY` padrão de desenvolvimento são rejeitados em `staging`/`production`, inclusive quando vêm de valores default; cabeçalho `Content-Security-Policy` na API.
- Dockerfiles aplicam atualizações de segurança do sistema base (`apt-get upgrade`/`apk upgrade`).

### 🧪 Testes
- Frontend com cobertura (`npm run test:coverage`, limite mínimo de 70%) e novos testes de componentes, serviços, hooks e fluxo do analista.

### 📚 Governança e documentação
- `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS` preenchido, `dependabot.yml` corrigido (npm em `/apps/frontend`, GitHub Actions, Docker e Terraform), `.pre-commit-config.yaml` com o nome correto e hooks do stack real.
- `docker-compose.yml` e `docker-compose.prod.yml` com serviço PostgreSQL.

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

[Unreleased]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.6...HEAD
[0.2.6]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.0...v0.2.2
[0.2.0]: https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ifpebj-ti/consulta-laudos-solo/releases/tag/v0.1.0
