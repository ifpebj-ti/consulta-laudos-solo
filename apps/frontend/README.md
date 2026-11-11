# Frontend — Consulta Laudos Solo

React 18 + Vite + TypeScript. Área pública de consulta do cliente e módulo do analista do Laboratório de Solos do IFPE Campus Belo Jardim.

## Requisitos

- Node `>=20.19` (veja `.nvmrc`).
- Backend rodando em `http://localhost:8080/api` para desenvolvimento.

## Comandos

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
npm run lint         # ESLint (inclui regras de acessibilidade e hooks) + checagem de tipos
npm run typecheck    # apenas tipos
npm test             # testes (Vitest + Testing Library)
npm run build        # build de produção em dist/
npm run verificar    # lint + testes + build
```

## Variáveis de ambiente

Todas estão documentadas em `.env.example`. Elas são lidas em tempo de build (Vite), então em produção precisam ser passadas como `--build-arg` no `Dockerfile`.

| Variável | Uso |
| --- | --- |
| `VITE_API_BASE_URL` | URL da API. Padrão: `http://localhost:8080/api` em dev e `/api` em produção. |
| `VITE_GOOGLE_CLIENT_ID` | Login do analista com Google. |
| `VITE_FEATURE_LISTAGEM_SERVIDOR` | Liga a listagem de amostras pelo servidor no painel. |
| `VITE_FEATURE_HOMOLOGACAO_SERVIDOR` | Liga a homologação pelo servidor. |

## Desenvolvimento

- Consulta do cliente: o botão "Preencher dados de teste" (só em dev) usa o laudo mockado do backend (`20101.2306` / `529.982.247-25`).
- Login do analista: sem `VITE_GOOGLE_CLIENT_ID`, use "Entrar como analista de teste" (mock do backend com `ENABLE_MOCK_AUTH`).
- As amostras do painel ficam no `localStorage` só em desenvolvimento, até o backend expor a listagem.

## Estrutura

```
src/
  components/   UI compartilhada (Button, Modal, Select, DatePicker...) e feedback (erro, carregando, 404)
  config/       ambiente e chaves de funcionalidade
  context/      sessão (AuthContext) e amostras do analista
  features/     telas por área (home, cliente, analista, erros)
  hooks/        hooks reutilizáveis
  lib/          funções puras (CPF, protocolo, datas, token, status, download)
  routes/       guarda de rota e helpers de navegação
  services/     cliente HTTP e serviços da API
  test/         configuração e utilitários de teste
```

## Integração com o backend

O contrato completo, incluindo o que ainda falta no backend (PDF, homologação, listagem), está em [`docs/contrato-api.md`](docs/contrato-api.md).
