# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.2.1](https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.0...v0.2.1) (2026-09-30)


### Bug Fixes

* **backend/security:** sanear manipulacao de caminhos de pdf contra p… ([f13adc3](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/f13adc36ecaad107befd2a416de327bd37ce7d19))
* **backend/security:** sanear manipulacao de caminhos de pdf contra path injection ([92a5d57](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/92a5d575971f2db4754534b05eda1fa1d51033e3))

## [Unreleased]

---

## [0.1.0] — 2025-09-21

### Added

- Autenticação de Analista via Google OAuth (backend FastAPI + frontend React)
- Consulta de laudo por Protocolo + CPF pelo Cliente
- Download de PDF de laudo pelo Cliente
- Pipeline CI/CD com lint, testes e build Docker no GitHub Actions
- Proteção de branch `main` com regras de revisão de PR
- Templates de Pull Request e Issues (Bug Report, Feature Request) no GitHub
- Convenções de branches (`docs/conventions/BRANCHES.md`) e commits (`docs/conventions/COMMITS.md`)
- Publicação de imagens Docker no GHCR com suporte a múltiplas arquiteturas (linux/amd64, linux/arm64)
- Varredura de vulnerabilidades com Trivy (severidades CRITICAL e HIGH)
- Relatório de cobertura de testes do backend gerado pelo pytest-cov (≥70%)
- Testes de integração do fluxo de autenticação do Cliente
- Quadro de backlog no GitHub Projects com user stories para as funcionalidades principais
- Documentação na Wiki: Documento de Visão, Análise de Concorrência, Arquitetura e Modelagem de Dados, Guia de Execução, Modelagem de Ameaças, Guia de Boas Práticas de Desenvolvimento Seguro

[Unreleased]: https://github.com/consulta-laudos-solo/consulta-laudos-solo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/consulta-laudos-solo/consulta-laudos-solo/releases/tag/v0.1.0
