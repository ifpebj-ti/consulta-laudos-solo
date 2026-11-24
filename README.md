# Consulta Laudos Solo

[![CI/CD](https://github.com/ifpebj-ti/consulta-laudos-solo/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/ifpebj-ti/consulta-laudos-solo/actions/workflows/ci-cd.yml)
[![Release](https://img.shields.io/github/v/release/ifpebj-ti/consulta-laudos-solo)](https://github.com/ifpebj-ti/consulta-laudos-solo/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Sistema web para consulta de laudos de análise de solo desenvolvido como Projeto Integrador do 7º Período. Permite que **Analistas** gerenciem laudos via autenticação Google OAuth e que **Clientes** consultem seus laudos informando protocolo e CPF.

O projeto adota arquitetura de monorepo, isolando frontend, backend e infraestrutura em seus respectivos diretórios.

---

## 📚 Documentação

| Documento | Link |
|-----------|------|
| Visão do Projeto | [Wiki → Visão de Projeto](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Visão-de-Projeto) |
| Análise de Concorrência | [Wiki → Análise de Concorrência](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Análise-de-Concorrência) |
| Arquitetura e Modelagem de Dados | [Wiki → Arquitetura e Modelagem de Dados](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Arquitetura-e-Modelagem-de-Dados) |
| Guia de Execução, Configuração e Operação | [Wiki → Guia de Execução](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Guia-de-Execução,-Configuração-e-Operação) |
| Modelagem de Ameaças | [Wiki → Modelagem de Ameaças](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Modelagem-de-Ameaças) |
| Boas Práticas de Desenvolvimento Seguro | [Wiki → Boas Práticas](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Guia-de-Boas-Práticas-de-Desenvolvimento-Seguro) |
| Estratégia de Testes | [docs/wiki/Estratégia-de-Testes.md](docs/wiki/Estrat%C3%A9gia-de-Testes.md) (publicar na Wiki) |
| Manual de Uso do Sistema | [docs/wiki/Manual-de-Uso-do-Sistema.md](docs/wiki/Manual-de-Uso-do-Sistema.md) (publicar na Wiki) |
| Protótipos de Interface (Figma) | _Pendente: informar o link do arquivo Figma da equipe_ |
| Backlog do Produto | _Pendente: criar o GitHub Project da organização e informar o link_ |
| Segurança | [SECURITY.md](SECURITY.md) |
| Como contribuir | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Histórico de versões | [CHANGELOG.md](CHANGELOG.md) |

## 👥 Equipe

| Integrante | Papel |
|------------|-------|
| Igor Nayan ([@igornayan](https://github.com/igornayan)) | _preencher (ex.: Desenvolvedor)_ |
| Gabriel Lourinaldo ([@GabrielLourinaldo](https://github.com/GabrielLourinaldo)) | _preencher (ex.: Desenvolvedor)_ |
| Gabriel Camelo | _preencher (ex.: Desenvolvedor)_ |

---
## 🏗️ Estrutura do Diretório

```
consulta-laudos-solo/
├── apps/
│   ├── frontend/     # React + Vite + TypeScript
│   └── backend/      # FastAPI (Python)
├── infra/            # Terraform — Oracle Cloud Infrastructure
├── docs/             # Convenções de branches e commits
└── .github/          # Workflows CI/CD e templates de PR/issue
```

- **`apps/frontend/`**: Interface web construída com React, Vite e TypeScript.
- **`apps/backend/`**: API REST desenvolvida em FastAPI (Python), com autenticação JWT e Google OAuth.
- **`infra/`**: Infraestrutura como Código (IaC) com módulos Terraform para `compute`, `network` e `registry` nos ambientes `dev` e `prod`.
- **`.devcontainer/`**: Definições para ambiente de desenvolvimento conteinerizado.
- **`.github/`**: Workflows de CI/CD e templates de PR e issues.

---

## 🚀 Como Executar Localmente

Pré-requisitos: **Docker** e **Docker Compose** instalados.

```bash
# 1. Clone o repositório
git clone https://github.com/ifpebj-ti/consulta-laudos-solo.git
cd consulta-laudos-solo

# 2. Configure as variáveis de ambiente do backend
cp apps/backend/.env.example apps/backend/.env
# Edite apps/backend/.env se necessário (para dev, os valores padrão já funcionam)

# 3. Suba o ambiente local
docker compose up --build

# 4. Verifique que o backend está saudável
curl http://localhost:8000/api/health
# Resposta esperada: {"status": "ok", "ambiente": "dev"}
```

Serviços disponíveis após `docker compose up --build`:

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend (API) | http://localhost:8000/api |
| Documentação interativa (Swagger) | http://localhost:8000/api/docs |

---

## 🐳 Containerização para Produção

Cada aplicação em `apps/` conta com um `Dockerfile` otimizado em múltiplos estágios (Multi-stage Build):

- **Frontend**: Primeiro estágio usa `node:20-alpine` para gerar o build estático; segundo estágio usa `nginx:alpine` para servir a aplicação na porta 80 com roteamento correto para SPA.
- **Banco**: PostgreSQL 16 no `docker-compose.yml` e no `docker-compose.prod.yml` (em dev local sem Docker o backend usa SQLite).
- **Backend**: Usa `python:3.12-slim` como imagem base, instala dependências via `pip` e expõe o servidor Uvicorn na porta 8000.

As imagens de produção são publicadas automaticamente no **GHCR** pelo pipeline CI/CD:
- `ghcr.io/ifpebj-ti/consulta-laudos-frontend:<versão>` (ex.: `0.2.6`)
- `ghcr.io/ifpebj-ti/consulta-laudos-backend:<versão>`

Cada imagem recebe as tags `latest`, `sha-<commit>`, `X.Y.Z`, `vX.Y.Z` e `X.Y`, em `linux/amd64` e `linux/arm64`. Em produção use sempre uma tag de versão: `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d` (defina `APP_VERSION` no `.env.prod`).

---

## 🛠️ Padronização e Qualidade

- **`.editorconfig`**: Impõe regras de estilo, indentação e formatação compatíveis com as principais IDEs.
- **`docs/conventions/BRANCHES.md`**: Convenção de nomenclatura de branches (`feat/`, `fix/`, `chore/`, `docs/`).
- **`docs/conventions/COMMITS.md`**: Padrão de mensagens de commit baseado em Conventional Commits v1.0.0.

---

## 📄 Licença

Este software está licenciado sob os termos da **Apache License, Versão 2.0**. Consulte o arquivo [`LICENSE`](./LICENSE) para mais detalhes.
