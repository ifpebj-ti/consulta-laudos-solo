# Como contribuir

## Fluxo

1. Crie uma branch a partir de `develop` seguindo [docs/conventions/BRANCHES.md](docs/conventions/BRANCHES.md) (`feat/`, `fix/`, `docs/`, `chore/`, `hotfix/`).
2. Faça commits no padrão [Conventional Commits](docs/conventions/COMMITS.md). O release-please usa essas mensagens para definir a versão e gerar o `CHANGELOG.md`.
3. Abra um Pull Request preenchendo o template. Merge somente via PR, com a CI verde e revisão de um dono (`.github/CODEOWNERS`).
4. Releases são criadas pelo release-please a partir da `main`. Não crie tags manualmente.

## Ambiente local

```bash
make setup                       # instala pre-commit e dependências do frontend
pip install pre-commit && pre-commit install --hook-type pre-commit --hook-type commit-msg
cp apps/backend/.env.example apps/backend/.env
docker compose up --build        # frontend, backend e PostgreSQL
```

## Checagens antes do PR

```bash
# backend (apps/backend)
black . --check && ruff check . && pytest --cov=src --cov-fail-under=70

# frontend (apps/frontend)
npm run lint && npm run test:coverage
```

Cobertura mínima: 70% no backend e no frontend.

## Segurança

Não commite segredos. Vulnerabilidades devem ser reportadas conforme [SECURITY.md](SECURITY.md).
