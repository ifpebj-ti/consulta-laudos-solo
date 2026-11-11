# 📜 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]
*Mudanças que estão atualmente em desenvolvimento (Open PRs).*

### 🚀 Novidades
- **Frontend:** Estilização da página do cliente (Client page style), incluindo revisão completa do fluxo de visualização de laudos, acessibilidade (focus trap, aria-live) e design system local (Inter font, sem dependências externas). (PR #67)

### ⚙️ Manutenção (Dependências)
- Atualização do `vite` para `8.3.4`. (PR #60)
- Atualização do `source-map-js` para `1.2.2`. (PR #53)
- Atualização do `httpx` para `>=0.28.1`. (PR #51)
- Atualização do `google-auth` para `>=2.58.1`. (PR #50)
- Atualização do `cryptography` para `>=50.0.1`. (PR #49)
- Atualização do `pytest` para `>=9.1.1`. (PR #48)
- Atualização do `hypothesis` para `>=6.168.2`. (PR #47)

---

## [0.2.5] - Fechamento de Versão
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

## [0.2.4]
*Correções de pipeline e build de imagem.*

### 🐛 Correções
- **Infra/Docker:** Correção na coleta de variáveis do Vite (`VITE_*`) durante o build da imagem do frontend para compilação correta com chave de login Google. (PR #58, #59)

---

## [0.2.3]
*Correções de ambiente containerizado.*

### 🐛 Correções
- **Infra/Docker:** Resolvido o conflito de portas (80 vs 8080) entre a aplicação Frontend e o proxy NGINX na inicialização do container. (PR #55, #56)

---

## [0.2.2]
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

## [0.2.0] e [0.2.1]
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

## [0.1.0] - Primeira Versão (Release)
*Configurações iniciais, arquitetura e fundação do projeto.*

### 🚀 Novidades
- **Arquitetura:** Definição da estrutura inicial em `monorepo` contemplando `apps/frontend` e `apps/backend`. (PR #1)
- **Backend:** Configuração da aplicação Python + Uvicorn utilizando FastAPI. (PR #1, #19)
- **Frontend:** Inicialização da aplicação React com Vite e TypeScript. (PR #1)
- **Infraestrutura:** Inclusão das rotinas de GitHub Actions e configuração da infraestrutura base como código (IaC) utilizando Terraform (HCL). (PR #1)