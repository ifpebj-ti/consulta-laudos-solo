# Base image oficial da Microsoft com .NET 8 SDK no Ubuntu 22.04 (Jammy)
FROM mcr.microsoft.com/devcontainers/dotnet:8.0-jammy

# Variáveis de versão
ARG NODE_VERSION="20"

# Evita interações manuais durante a instalação com o apt-get
ENV DEBIAN_FRONTEND=noninteractive

# 1. Atualização do sistema e instalação de utilitários básicos
RUN apt-get update && apt-get -y install --no-install-recommends \
    curl \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    # Instala o pre-commit diretamente via apt (mais seguro no Ubuntu 22.04 do que via pip global)
    pre-commit \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Instalação do Node.js (v20 LTS) para o Frontend Vite/React
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Instalação do Terraform (Repositório Oficial da HashiCorp)
RUN curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update && apt-get -y install terraform \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 4. Instalação do OCI CLI (Oracle Cloud Infrastructure Command Line Interface)
# Muito útil para o desenvolvedor testar comandos na OCI antes de colocar no Terraform
RUN bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults

# 5. Instalação do Docker CLI (Para rodar o docker-compose de dentro do devcontainer)
# Não instalamos o Docker Engine inteiro, apenas o CLI para se comunicar com o Docker do Host (DooD)
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update && apt-get -y install docker-ce-cli docker-compose-plugin \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Troca para o usuário padrão do devcontainer criado pela imagem da Microsoft (vscode)
USER vscode

# Garante que o OCI CLI fique no PATH do usuário
ENV PATH="/home/vscode/bin:${PATH}"