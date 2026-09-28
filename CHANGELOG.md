# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

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
