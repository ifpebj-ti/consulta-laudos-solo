# Roteiro de exemplo: ciclo completo de um laudo

Cenário: o laboratório recebe uma amostra do Sr. José Teste da Silva, o analista registra e processa a análise, e o cliente consulta e baixa o laudo.

Execução registrada: [registros/execucao-20261124-195957.md](registros/execucao-20261124-195957.md) (16 passaram, 0 falharam, 2 pulados).

## Pré-requisitos

- Backend e frontend no ar (`docker compose up --build`, ou os comandos da seção 9 de [../ESTRATEGIA.md](../ESTRATEGIA.md)).
- Ambiente `dev` com login de teste ativo. Na tela de login do analista aparece o botão "Entrar como analista de teste".
- Dados de teste: CPF `529.982.247-25`. Nenhum dado real.

## Parte A: pela interface (execução manual)

Registre o resultado em uma cópia de [MODELO-REGISTRO-MANUAL.md](MODELO-REGISTRO-MANUAL.md).

| # | Ação | Resultado esperado |
|--:|------|--------------------|
| A1 | Abra a página inicial e clique em **Sou analista** | Tela de login do módulo do analista |
| A2 | Clique em **Entrar como analista de teste** | Painel do Analista, nome do analista no topo |
| A3 | Clique em **Registrar Nova Análise** e em **Preencher dados de teste** | Campos do modal preenchidos |
| A4 | Troque o protocolo por `E2E-001` (ou outro inédito) e clique em **Continuar para o Registro** | Tela "Gestão de Análises Laboratoriais" com solicitante e protocolo no cabeçalho |
| A5 | Repita A3 e A4 com o mesmo protocolo | Mensagem "Já existe uma amostra com o protocolo ..." |
| A6 | Informe pH 5,4, Na 12, K 45 e aguarde 2 segundos | Aparece "✓ Rascunho salvo às HH:MM:SS" |
| A7 | Clique em **Salvar e Processar Cálculos** sem calibração e sem TFSA | Mensagens pedindo curva de calibração e peso da amostra (TFSA) |
| A8 | Preencha os dados de bancada da tabela abaixo, aplique a calibração e clique em **Salvar e Processar Cálculos** | Aba de homologação com os valores calculados |
| A9 | Confira Na e K em cmolc/dm³ e a classe textural | Na ≈ 0,05 e K ≈ 0,12 cmolc/dm³ para Na 12 mg/L e K 45 mg/L |
| A10 | Clique em **Assinar Digitalmente** | Em dev a homologação é simulada no navegador; o laudo passa a Concluído |
| A11 | Clique em **Sair**, volte à página inicial e escolha **Sou cliente** | Tela de consulta |
| A12 | Tente consultar `20101.2306` com um CPF válido diferente (ex.: `111.444.777-35`) | Mensagem neutra, sem indicar o campo errado |
| A13 | Consulte `20101.2306` com `529.982.247-25` | Tela do laudo com CPF mascarado `***.982.247-**` |
| A14 | Clique em **Baixar laudo (PDF)** | Download do PDF, ou aviso "PDF ainda não disponível" se a pasta de PDFs estiver vazia |

Dados de bancada para A8:

| Grupo | Campo | Valor |
|-------|-------|-------|
| Química | pH / P (absorbância bruta) | 5,4 / 0,612 |
| Química | Na / K (mg/L) | 12 / 45 |
| Química | Ca / Mg / Al / H+Al (medido, branco 0) | 2,1 / 0,85 / 0,3 / 3,2 |
| Granulometria | TFSA | 20 |
| Granulometria | Areia (becker, vazio) | 15,9312 / 4,492 |
| Granulometria | Argila (becker, vazio) | 4,5824 / 4,4899 |
| Granulometria | NaOH (becker, vazio) | 4,479 / 4,4711 |
| Calibração P | a / b / R² | 0,033 / 0,019 / 0,9998 |
| Calibração P | Pontos (x, y) | (0, 0,02) (5, 0,18) (10, 0,35) (15, 0,52) (20, 0,68) |

## Parte B: pela API (automatizada)

```bash
python e2e/scripts/executar_roteiro.py --base-url http://localhost:8002/api --storage-dir <pasta de PDFs da API>
```

O script percorre os 18 passos descritos em [../ESTRATEGIA.md](../ESTRATEGIA.md) §4 e grava o registro em `registros/`.

Exemplo de resultado dos passos centrais (execução registrada):

| Passo | Resultado |
|-------|-----------|
| Cadastro da amostra | 201, status EM_ANALISE, versão 1 |
| Auto-save | 200, versão 2 |
| Salvar com versão antiga | 409 (conflito de edição) |
| Processar sem calibração/TFSA | 422 |
| Processar com dados completos | 200, AGUARDANDO_HOMOLOGACAO, versão 3 |
| CPF exibido ao cliente | `***.982.247-**` |
| PDF de outro protocolo | 403 |
| Path traversal | 404 |

## Passos pulados nesta versão

- **Homologação pelo servidor:** o endpoint não existe no backend.
- **Consulta do cliente com a amostra recém-cadastrada:** a consulta ainda lê uma base em memória, e por isso a parte do cliente usa o protocolo `20101.2306`.

Detalhes e plano de correção em [../ESTRATEGIA.md](../ESTRATEGIA.md) §7.
