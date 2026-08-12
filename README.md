# Consulta Laudos Solo

Este repositório contém o código-fonte, a configuração de infraestrutura e os ambientes de desenvolvimento do projeto **Consulta Laudos Solo**. O projeto adota a arquitetura de monorepo, isolando as camadas de frontend, backend e infraestrutura em seus respectivos diretórios.

## 🏗️ Estrutura do Diretório

O monorepo está organizado da seguinte maneira:

* **`apps/frontend/`**: Aplicação de interface configurada com Vite e React, contendo arquivos de orquestração como o `vite.config.ts` e dependências no `package.json`.
* **`apps/backend/`**: API principal desenvolvida em .NET, ancorada pelo arquivo de solução `Backend.sln`.
* **`infra/`**: Definições de Infraestrutura como Código (IaC), separadas logicamente em módulos (`compute`, `network`, `registry`) e parametrizadas para os ambientes de `dev` e `prod`.
* **`.devcontainer/`**: Padrões e definições para provisionamento de ambiente de desenvolvimento conteinerizado.
* **`.github/`**: Diretório base para abrigar a automação e workflows de integração contínua (CI/CD).

## 🚀 Como Executar o Projeto Localmente

O projeto faz uso do `docker-compose.yml` para unificar e subir a stack de desenvolvimento local com facilidade. Os seguintes serviços estão orquestrados:

* **Frontend**: Executa na porta `5173`, mapeando o diretório local para dentro do container e preservando os `node_modules` de conflitos com o host.
* **Backend**: Utiliza a imagem do SDK do .NET 8.0, rodando na porta `8080`. O ambiente aplica o comando `dotnet watch`, ativando o monitoramento de arquivos para re-compilação em tempo real e desativando o hot-reload nativo (`--no-hot-reload`).

## 🐳 Containerização para Produção

Cada aplicação em `apps/` conta com um `Dockerfile` otimizado em múltiplos estágios (Multi-stage Build):

* **Frontend**: O primeiro estágio utiliza a imagem `node:20-alpine` para baixar dependências e gerar o build estático. O segundo estágio utiliza o servidor `nginx:alpine` para servir a aplicação na porta 80, injetando um `nginx.conf` customizado com a diretiva `try_files` para garantir o roteamento correto da Single Page Application.
* **Backend**: Inicia com a imagem do SDK do .NET 8.0 para restaurar dependências e publicar o código otimizado (`Release`). A versão final utiliza exclusivamente a imagem de runtime do ASP.NET 8.0, definindo o ponto de entrada seguro e leve para a `ApiPrincipal.dll`.

## 🛠️ Padronização e Qualidade

Ferramentas de qualidade de código estão configuradas na raiz do projeto para manter todos os desenvolvedores alinhados:

* **`.editorconfig`**: Impõe regras automáticas de estilo, indentação e formatação compatíveis com a maioria das IDEs do mercado.
* **`pre-commit-config.yaml`**: Define os "hooks" obrigatórios que serão avaliados localmente antes de autorizar qualquer commit no repositório.
* **`Makefile`**: Encapsula comandos úteis de execução e setup do ambiente de trabalho.

## 📄 Licença

Este software está licenciado sob os termos da **Apache License, Versão 2.0** (Janeiro de 2004). O uso, reprodução ou distribuição pressupõe a concordância com os termos que isentam os mantenedores de garantias explícitas e responsabilidade direta.