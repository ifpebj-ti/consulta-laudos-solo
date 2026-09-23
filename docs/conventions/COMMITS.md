# Convenção de Mensagens de Commit

Este documento descreve o padrão adotado para mensagens de commit no repositório **Consulta Laudos Solo**, baseado em [Conventional Commits v1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/).

---

## Formato

```
<tipo>(<escopo opcional>): <descrição breve>

[corpo opcional]

[rodapé(s) opcional(is)]
```

---

## Tipos

| Tipo       | Quando usar |
|------------|-------------|
| `feat`     | Adição de nova funcionalidade |
| `fix`      | Correção de bug |
| `docs`     | Mudanças apenas na documentação |
| `test`     | Adição ou correção de testes |
| `chore`    | Tarefas de manutenção (dependências, CI, config) |
| `refactor` | Refatoração de código sem mudança de comportamento |
| `style`    | Formatação, espaçamentos — sem mudança de lógica |
| `perf`     | Melhoria de desempenho |

---

## Exemplos

```
feat: adiciona endpoint de revogação de acesso do analista
```

```
fix: corrige timing attack na comparação de CPF
```

```
docs: atualiza instruções de execução local no README
```

```
test: adiciona testes de integração do fluxo de autenticação do cliente
```

---

## Regras Gerais

- A descrição deve estar em **letras minúsculas** e no **modo imperativo** (ex.: "adiciona", "corrige", "atualiza").
- A primeira linha (cabeçalho) deve ter no máximo **72 caracteres**.
- Use o corpo do commit para explicar **o quê** e **por quê** (não o como).
- Para mudanças que quebram compatibilidade (breaking changes), adicione `BREAKING CHANGE:` no rodapé.
- Sempre vincule a issue relacionada no rodapé com `Closes #<número>` ou `Refs #<número>`.

---

## Exemplos completos

```
feat(auth): adiciona endpoint de revogação de acesso do analista

Implementa POST /api/admin/analysts/{email}/revoke com autenticação
por X-Admin-Token. Armazena emails revogados em memória e invalida
JTIs de sessões ativas.

Closes #42
```

```
fix(deps): corrige vulnerabilidade crítica no PyJWT

Atualiza PyJWT de 2.6.0 para 2.8.0 para corrigir CVE-2024-33663.

Refs #17
```
