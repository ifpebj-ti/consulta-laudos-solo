# Política de Segurança

## Versões suportadas

Recebe correções de segurança apenas a última versão publicada (ver [Releases](https://github.com/ifpebj-ti/consulta-laudos-solo/releases)).

## Como reportar uma vulnerabilidade

Não abra issue pública. Use o relato privado do GitHub:
<https://github.com/ifpebj-ti/consulta-laudos-solo/security/advisories/new>

Inclua: descrição, passos para reproduzir, impacto e versão afetada.

Prazos alvo: confirmação do recebimento em até 5 dias úteis e plano de correção em até 30 dias.

## Controles automatizados

| Controle | Onde |
|----------|------|
| Varredura de imagens (Trivy, falha em CRITICAL/HIGH com correção disponível) | `.github/workflows/ci-cd.yml` |
| SAST (Semgrep, bloqueante) | `.github/workflows/ci-cd.yml` |
| DAST (OWASP ZAP API scan, bloqueante) | `.github/workflows/ci-cd.yml`, regras em `.zap/rules.tsv` |
| Dependências (Dependabot: pip, npm, Actions, Docker, Terraform) | `.github/dependabot.yml` |

## Documentação relacionada (Wiki)

- Modelagem de Ameaças
- Guia de Boas Práticas de Desenvolvimento Seguro
