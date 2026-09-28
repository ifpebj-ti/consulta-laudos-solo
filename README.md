# Consulta Laudos Solo

[![CI/CD](https://github.com/ifpebj-ti/consulta-laudos-solo/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/ifpebj-ti/consulta-laudos-solo/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Sistema web para consulta de laudos de análise de solo desenvolvido como Projeto Integrador do 7º Período. Permite que **Analistas** gerenciem laudos via autenticação Google OAuth e que **Clientes** consultem seus laudos informando protocolo e CPF.

O projeto adota arquitetura de monorepo, isolando frontend, backend e infraestrutura em seus respectivos diretórios.

---

## 📚 Documentação

| Documento | Link |
|-----------|------|
| Documento de Visão | [Wiki → Documento de Visão](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Documento-de-Visão) |
| Arquitetura e Modelagem de Dados | [Wiki → Arquitetura e Modelagem de Dados](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Arquitetura-e-Modelagem-de-Dados) |
| Guia de Execução, Configuração e Operação | [Wiki → Guia de Execução, Configuração e Operação](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Guia-de-Execução,-Configuração-e-Operação) |
| Manual de Uso do Sistema | [Wiki → Manual de Uso do Sistema](https://github.com/ifpebj-ti/consulta-laudos-solo/wiki/Manual-de-Uso-do-Sistema) |
| Protótipos de Interface | [Figma — preencher link](https://figma.com/) <!-- TODO: substituir pelo link real do Figma --> |
| Backlog do Produto | [GitHub Projects — preencher link](https://github.com/orgs/ifpebj-ti/projects/) <!-- TODO: substituir pelo link real do quadro --> |

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
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000/api |
| Documentação interativa (Swagger) | http://localhost:8000/api/docs |

---

## 🐳 Containerização para Produção

Cada aplicação em `apps/` conta com um `Dockerfile` otimizado em múltiplos estágios (Multi-stage Build):

- **Frontend**: Primeiro estágio usa `node:20-alpine` para gerar o build estático; segundo estágio usa `nginx:alpine` para servir a aplicação na porta 80 com roteamento correto para SPA.
- **Backend**: Usa `python:3.12-slim` como imagem base, instala dependências via `pip` e expõe o servidor Uvicorn na porta 8000.

As imagens de produção são publicadas automaticamente no **GHCR** pelo pipeline CI/CD:
- `ghcr.io/ifpebj-ti/consulta-laudos-frontend:latest`
- `ghcr.io/ifpebj-ti/consulta-laudos-backend:latest`

---

## 🛠️ Padronização e Qualidade

- **`.editorconfig`**: Impõe regras de estilo, indentação e formatação compatíveis com as principais IDEs.
- **`docs/conventions/BRANCHES.md`**: Convenção de nomenclatura de branches (`feat/`, `fix/`, `chore/`, `docs/`).
- **`docs/conventions/COMMITS.md`**: Padrão de mensagens de commit baseado em Conventional Commits v1.0.0.

---

## 📄 Licença

Este software está licenciado sob os termos da **Apache License, Versão 2.0**. Consulte o arquivo [`LICENSE`](./LICENSE) para mais detalhes.
