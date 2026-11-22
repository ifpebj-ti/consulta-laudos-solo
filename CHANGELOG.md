# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.3.0](https://github.com/ifpebj-ti/consulta-laudos-solo/compare/v0.2.5...v0.3.0) (2026-11-22)


### Features

* **backend:** adiciona campos de analista e metadados ao laudo ([1290183](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/12901837773c7197e1f8d9983e33568bb3d2d2c3))
* **backend:** adiciona funcoes de hash e verificacao pbkdf2 ([cd078d4](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/cd078d4c7273ef1bb563453a6fece4af4df3076f))
* **backend:** adiciona listagem de laudos e valida roles no router ([1a50caf](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/1a50caf6d6d67c749649203201286cd30e583df8))
* **backend:** adiciona modelo usuario com roles e vinculo auxiliar ([f60c6fc](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/f60c6fc0d269ff2b73dbbe2427127c57673ff159))
* **backend:** adiciona router de gestao de analistas e auxiliares ([b2731d7](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/b2731d7f6551025fb4b40f549cfa8b16e7622d80))
* **backend:** adiciona schemas de login local e gestao de usuarios ([2b738bf](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/2b738bf167f5a019b35279d5e4e9e61f6bc7952d))
* **backend:** adiciona seed de poweruser e analista dev no banco ([bf1954a](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/bf1954a74d69f82220b37b6b7b05db0ded0ab5fe))
* **backend:** aplica escopo de analista e listagem no service ([7fd2de8](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/7fd2de8d5a11b68bd1e878307416483497fea078))
* **backend:** estende schemas de analise com metadados e crea ([6e33639](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/6e33639c8a7390167df4faf15de7aefba25f43ca))
* **backend:** exporta modelo usuario no pacote de models ([6ff9c5c](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/6ff9c5c1f346e760bac73dfb82af2e48f14cf541))
* **backend:** implementa endpoint de login local no router auth ([ff7550e](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/ff7550e14715521fd6eb06cc41839f9d42561f95))
* **backend:** registra router de usuarios na aplicacao fastapi ([cb988aa](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/cb988aa75c1d84c2e736e94ca0c75cbbdfa635f5))
* **backend:** suporta multiplas roles na dependencia require_role ([0a79e10](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/0a79e10979bd31eb873b67e860bd9ad90cb0cbbd))
* **docker:** add component in docker ignore ([2896e75](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/2896e75564eca2e28a8eebecd1b53c3278df117c))
* **front:** add pdf download simulation ([41027db](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/41027dbfc7c6b743e717a23fe4af25c98de09a48))
* **frontend/analista:** Na/K em cmolc, H+Al com fator NaOH, classe textural pelo triângulo, pendências e situações da análise ([b21841b](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/b21841b42d5021cc6bd28356f759eaa268384aa4))
* **frontend/analista:** Na/K em cmolc, H+Al com fator NaOH, classe textural pelo triângulo, pendências e situações da análise ([3a78511](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/3a78511886ede4405e772617900068631e11dd7f))
* **frontend/base:** cliente HTTP robusto, sessão com expiração, rotas protegidas, 404, tela de erro e aviso de conexão ([1ddce1c](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/1ddce1cb183a3fabce572b35110cb5b76be898a2))
* **frontend/base:** cliente HTTP robusto, sessão com expiração, rotas protegidas, 404, tela de erro e aviso de conexão ([ef1c4b4](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/ef1c4b4180ff422020c4ef1f3750d547f3d6bac5))
* **frontend/cliente:** laudo com dados em destaque, estados da situação e download real do PDF ([22d9d11](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/22d9d113bfecc454b67aece775f2e4b09d32056a))
* **frontend/cliente:** laudo com dados em destaque, estados da situação e download real do PDF ([5de6606](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/5de660640eaac24744d24d36eaaf34021fb7088d))
* **frontend:** adiciona autenticacao com credenciais locais ([62f02d1](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/62f02d1eb9c3a8618d2ce5d9d9116202e5cc2940))
* **frontend:** adiciona formulario de login local do poweruser ([e46bcf7](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/e46bcf778f5374957a786b21bf3614a5318dba0a))
* **frontend:** adiciona gestao de auxiliares no painel analista ([f9e642c](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/f9e642c718f9d9eda92d451a14e5e06b1edc4e36))
* **frontend:** adiciona listagem de amostras e novos metadados ([72347b0](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/72347b024999d1dfbc7c5d53c6fdd08ac831de7e))
* **frontend:** adiciona metodos de login local e gestao de contas ([a121e0b](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/a121e0be69def6be1c88372c5d6f42b69c3d8f26))
* **frontend:** adiciona tela de gestao de analistas principais ([28c85b0](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/28c85b003c3d4e13b52d62d105a800b6f87d9978))
* **frontend:** atualiza tipos de autenticacao e perfis de analista ([633cf8d](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/633cf8da82ba3bbaae832fc06b530c139699fc69))
* **frontend:** configura rotas para poweruser analistas e equipe ([8b64c99](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/8b64c9925620f9688b854d9baa45d383c347cc94))
* **frontend:** exibe nome e crea dinamicos no rodape do laudo ([d8bbf13](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/d8bbf130653f8d4f737ae8ba46f2616007eb2e82))
* **frontend:** repassa dados do responsavel tecnico a homologacao ([23576f2](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/23576f2161b816b31085741a9e619af368c4dbed))
* **frontend:** sincroniza amostras e isola cache por analista ([0866e2e](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/0866e2e804ad4541e310a169ce02df7a91fe473a))
* **frontend:** suporta multiplas roles na rota protegida ([a98e541](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/a98e5417b4c2da8e072d368751a4a6cd32ac5852))


### Bug Fixes

* **frontend:** tipa sobrecargas de listarAmostras sem any ([0846ca5](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/0846ca58833dd3d800f08869fab066bb06178474))
* **frontend:** validar respostas da API, PDF corrompido, 412, Retry-After e transição do aviso de PDF ([2536c76](https://github.com/ifpebj-ti/consulta-laudos-solo/commit/2536c768458fd544feb9f696315e5a01cacdbae5))

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
