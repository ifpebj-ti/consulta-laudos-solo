# Estratégia de Testes Ponta a Ponta (E2E)

Complementa a [Estratégia de Testes](../docs/wiki/Estratégia-de-Testes.md). Os testes unitários e de integração já cobrem módulos isolados; o E2E verifica o ciclo completo de um laudo, do cadastro da amostra ao download do PDF, com a aplicação rodando de verdade.

## 1. Escopo

Jornada principal, em ordem:

1. Analista autentica.
2. Analista cadastra a amostra.
3. Analista registra a bancada (auto-save) e processa os cálculos.
4. Analista homologa o laudo.
5. Cliente consulta por protocolo e CPF e baixa o PDF.

Fora do escopo: desempenho sob carga, testes de infraestrutura (Terraform) e Google OAuth real (usa-se o login de teste `mock-dev-token`).

## 2. Camadas

| Camada | Ferramenta | O que valida | Estado |
|--------|------------|--------------|--------|
| E2E de API | `e2e/scripts/executar_roteiro.py` (httpx) | Ciclo do laudo, regras de autorização, versionamento otimista, neutralidade de erros, path traversal | **Implementada** |
| E2E de UI | Playwright (Chromium) contra `docker compose up` | Mesmos cenários pela interface: login de teste, modal Nova Amostra, registro, processamento, consulta do cliente | Planejada (§8) |
| Roteiro manual | `e2e/roteiro-exemplo/ROTEIRO.md` | Validação exploratória e demonstração, com registro de execução | **Implementada** |

## 3. Ambiente

| Item | Valor |
|------|-------|
| Aplicação | Backend em `ENVIRONMENT=dev`, `ENABLE_MOCK_AUTH=true`, `GOOGLE_CLIENT_ID` vazio |
| Banco | SQLite temporário (`DATABASE_URL`) ou PostgreSQL do `docker-compose.yml`. Nunca o banco de produção |
| PDFs | `STORAGE_DIR` temporário; o script cria e remove um PDF mínimo de teste |
| Dados | Protocolo único por execução (`E2E-AAAAMMDD-HHMMSS`) e CPF de teste `529.982.247-25`. Sem dados reais |
| Segurança | O mock de login é recusado pela API em `staging`/`production`, então o roteiro não roda nesses ambientes |

## 4. Cenários

| ID | Cenário | Tipo | Passo no script |
|----|---------|------|:---------------:|
| E2E-01 | API responde saudável | Fumaça | 1 |
| E2E-02 | Login do analista | Positivo | 2 |
| E2E-03 | Cadastro de amostra (status EM_ANALISE, versão 1) | Positivo | 3 |
| E2E-04 | Protocolo duplicado recusado (409) | Negativo | 4 |
| E2E-05 | Abrir análise com dados do solicitante | Positivo | 5 |
| E2E-06 | Auto-save incrementa a versão | Positivo | 6 |
| E2E-07 | Versão desatualizada gera conflito (409) | Negativo | 7 |
| E2E-08 | Processar sem calibração/TFSA é bloqueado (422) | Negativo | 8 |
| E2E-09 | Processamento calcula e avança para AGUARDANDO_HOMOLOGACAO | Positivo | 9 |
| E2E-10 | Resultado persiste após reabrir | Positivo | 10 |
| E2E-11 | Homologação pelo servidor (CONCLUIDO) | Positivo | 11 (pulado, §7) |
| E2E-12 | Cliente não acessa a bancada (403) | Segurança | 12 |
| E2E-13 | Consulta do cliente com CPF mascarado | Positivo | 13 |
| E2E-14 | CPF errado recebe resposta neutra (401) | Segurança | 14 |
| E2E-15 | Amostra nova aparece na consulta do cliente | Positivo | 15 (pulado, §7) |
| E2E-16 | Download do PDF | Positivo | 16 |
| E2E-17 | PDF de outro protocolo é negado (BOLA, 403) | Segurança | 17 |
| E2E-18 | Path traversal é barrado | Segurança | 18 |

## 5. Critérios

- **Passou:** todos os passos executados com o status esperado.
- **Falhou:** qualquer divergência. O script sai com código 1 e o registro mostra esperado versus obtido.
- **Pulado:** o recurso ainda não existe (§7). O passo é registrado como pulado, e vira falha assim que o backend implementar o recurso e o teste for endurecido.
- Código de saída 2 indica falha de rede (API fora do ar).

## 6. Evidências e rastreabilidade

Cada execução grava em `e2e/roteiro-exemplo/registros/`:

- `execucao-<data>.md`: tabela passo a passo (esperado, obtido, HTTP, tempo, resultado) e os cálculos devolvidos pelo servidor.
- `execucao-<data>.json`: os mesmos dados, para ferramentas.

CPFs completos não são gravados nos registros: a API devolve o CPF mascarado e o script só reporta a máscara.

## 7. Lacunas conhecidas

| Lacuna | Efeito no E2E | Como fechar |
|--------|---------------|-------------|
| Não existe `POST /laudos/{protocolo}/homologar` no backend (o frontend simula em dev, flag `VITE_FEATURE_HOMOLOGACAO_SERVIDOR`) | Passo 11 pulado | Implementar o endpoint; trocar o passo para exigir 200 e status CONCLUIDO |
| A consulta do cliente (`/auth/cliente`) lê `BASE_LAUDOS_MOCK`, não o banco | Passo 15 pulado; o passo 13 usa protocolo da base em memória | Migrar `LaudoAuthService` para o banco; exigir 200 no passo 15 |
| O PDF não é gerado na homologação | O passo 16 usa um PDF de teste criado pelo script | Gerar o PDF ao homologar e validar o conteúdo |

## 8. Plano de evolução

1. **Playwright:** projeto em `e2e/ui/` com os cenários E2E-02, 03, 09, 13 e 16 pela interface (login de teste do analista, Nova Amostra, Processar, consulta do cliente, download). Roda contra `docker compose up`.
2. **CI:** job `e2e` em `.github/workflows/ci-cd.yml` que sobe o backend (SQLite temporário), executa o script e publica `registros/` como artefato. Bloqueia o merge quando falhar.
3. **Endurecimento:** ao implementar as lacunas da §7, transformar os passos pulados em obrigatórios.
4. **Dados:** limpeza automática dos protocolos `E2E-*` em ambientes compartilhados.

## 9. Como executar

```bash
# 1. subir a API (exemplo com SQLite temporário)
cd apps/backend
ENVIRONMENT=dev ENABLE_MOCK_AUTH=true GOOGLE_CLIENT_ID= \
DATABASE_URL=sqlite+aiosqlite:////tmp/e2e.db STORAGE_DIR=/tmp/e2e-storage \
uvicorn src.application.main:app --port 8002

# 2. em outro terminal, na raiz do repositório
python e2e/scripts/executar_roteiro.py --base-url http://localhost:8002/api --storage-dir /tmp/e2e-storage
```

No PowerShell, defina as variáveis com `$env:NOME='valor'` antes de iniciar o `uvicorn`.
