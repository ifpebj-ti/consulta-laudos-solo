# Convenção de Nomenclatura de Branches

Este documento descreve o padrão adotado para nomenclatura de branches no repositório **Consulta Laudos Solo**.

---

## Prefixos

| Prefixo  | Uso |
|----------|-----|
| `feat/`  | Nova funcionalidade |
| `fix/`   | Correção de bug |
| `chore/` | Tarefas de manutenção (dependências, CI, configuração) |
| `docs/`  | Apenas documentação |

---

## Padrão de Nomenclatura

```
<prefixo>/<issue-id>-<descricao-kebab>
```

- `<prefixo>`: um dos prefixos listados acima
- `<issue-id>`: número da issue relacionada no GitHub (ex.: `42`)
- `<descricao-kebab>`: descrição curta em kebab-case (letras minúsculas, palavras separadas por hífen)

---

## Exemplos

```
feat/42-admin-revoke-endpoint
fix/17-corrige-timing-attack-cpf
chore/5-atualiza-dependencias-backend
docs/8-adiciona-guia-de-execucao-local
```

---

## Regras Gerais

- Use apenas letras minúsculas, números e hífens na descrição.
- Evite descrições genéricas como `fix/bug` ou `feat/nova-feature`.
- Toda branch deve estar associada a uma issue antes de ser aberta para revisão (PR).
- A branch `main` é protegida — nunca faça push direto.
