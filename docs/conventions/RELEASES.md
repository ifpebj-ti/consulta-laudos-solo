# Fluxo de Releases

Fluxo único, do código até a imagem publicada. Tags, releases, CHANGELOG e imagens do GHCR sempre têm o mesmo número de versão.

```
feat/*, fix/*, chore/*, docs/*  ──PR──►  develop
                                          │ (congela o escopo)
                                  release/vX.Y.Z   ← só ajustes de release
                                          │
                                         PR (merge commit)
                                          ▼
                                        main  ──push──►  CI: testes, Semgrep, ZAP, Trivy, imagens :latest e :sha-<commit>
                                          │
                              release-please abre o PR "chore(main): release X.Y.Z"
                                          │ (merge)
                                          ▼
                       tag vX.Y.Z + GitHub Release + CHANGELOG + imagens :X.Y.Z, :vX.Y.Z, :X.Y
                                          │
                                  sync automático  main ──PR──► develop
```

## Regras

1. Feature, fix e chore entram **somente na `develop`**, por PR. Nada vai direto para a `main`.
2. Para fechar uma versão, crie `release/vX.Y.Z` a partir da `develop`. Nela entram apenas correções da release (testes, docs, versão). Abra PR para a `main` e use **merge commit**.
3. **Ninguém cria tag ou release à mão e nenhuma tag é criada na branch de release.** A tag é criada pelo release-please na `main`.
4. Depois do merge na `main`, o release-please abre o PR `chore(main): release X.Y.Z`, que atualiza `CHANGELOG.md`, `version.txt`, `.release-please-manifest.json` e a versão de `apps/frontend/package.json`. Revise e faça o merge desse PR: é ele que cria a tag, a release e as tags de versão das imagens.
5. A versão segue SemVer a partir das mensagens (Conventional Commits): `fix` incrementa o patch, `feat` incrementa o minor, e no `0.x` o `feat` também incrementa só o patch (`bump-patch-for-minor-pre-major`). `feat!` ou `BREAKING CHANGE` incrementa o minor enquanto estivermos no `0.x`.
6. Hotfix: branch `hotfix/*` a partir da `main`, PR para a `main` e o sync automático leva a correção à `develop`.
7. Em produção, use sempre uma tag de versão (`APP_VERSION=0.2.9` no `.env.prod`). Nunca `:latest`.

## Configuração necessária no GitHub (uma vez)

- Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests": ativado.
- Segredo `RELEASE_PLEASE_TOKEN` (PAT ou GitHub App com `contents` e `pull-requests`). Sem ele o PR de release é aberto, mas a CI não roda nele e o merge fica bloqueado se os checks forem obrigatórios.
- Proteção da `main`: PR obrigatório, checks `test-and-lint`, `semgrep`, `build-scan-push` e `zap-scan` obrigatórios, sem push direto.
- Segredo `VITE_GOOGLE_CLIENT_ID`.

## Transição para a v0.2.9 (única vez)

As versões 0.2.6, 0.2.7 e 0.2.8 não seguiram este fluxo. Para a primeira release correta, `release-please-config.json` contém duas travas temporárias:

- `last-release-sha`: início da contagem de commits (a tag `v0.2.7`).
- `release-as: 0.2.9`: força o número da versão.

**Depois que a v0.2.9 for publicada, remova as duas linhas** (PR `chore(release): remove travas de transição`). Sem isso, o release-please continuaria propondo a mesma versão.

## Checklist de fechamento

- [ ] `develop` com CI verde
- [ ] `release/vX.Y.Z` criada a partir da `develop`
- [ ] PR `release/vX.Y.Z` → `main` com todos os checks verdes
- [ ] Merge commit na `main`
- [ ] PR `chore(main): release X.Y.Z` revisado e mergeado
- [ ] Tag, release e imagens com a nova versão conferidas (`docker manifest inspect ghcr.io/ifpebj-ti/consulta-laudos-backend:X.Y.Z`)
- [ ] PR de sync `main → develop` mergeado
- [ ] Atualizar `APP_VERSION` no servidor de produção