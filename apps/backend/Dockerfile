# Estágio 1: Build (SDK)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copia a Solução e os arquivos de projeto primeiro para aproveitar o cache do Docker
COPY ["Backend.sln", "./"]
COPY ["src/ApiPrincipal/ApiPrincipal.csproj", "src/ApiPrincipal/"]
COPY ["src/Core/Core.csproj", "src/Core/"]
# Se tiver projetos de teste, copie-os aqui também se quiser rodar testes no build

# Restaura as dependências
RUN dotnet restore

# Copia o resto do código e compila
COPY . .
WORKDIR "/src/src/ApiPrincipal"
RUN dotnet build -c Release -o /app/build
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Estágio 2: Runtime (Produção)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 8080

# Cria um usuário não-root por segurança (Best Practice em conteinerização)
USER app

# Copia os arquivos compilados do estágio 1
COPY --from=build /app/publish .

# Ponto de entrada da aplicação
ENTRYPOINT ["dotnet", "ApiPrincipal.dll"]