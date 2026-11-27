# Estágio 1: Build
# Roda na arquitetura do runner (BUILDPLATFORM): o resultado é estático e independe da CPU.
# Evita executar npm/Node sob emulação QEMU no build arm64, que falha com 'Illegal instruction'.
FROM --platform=$BUILDPLATFORM node:26-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APP_VERSION
ARG VITE_FEATURE_LISTAGEM_SERVIDOR=false
ARG VITE_FEATURE_HOMOLOGACAO_SERVIDOR=false
ARG VITE_FEATURE_SITUACAO_CLIENTE=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_FEATURE_LISTAGEM_SERVIDOR=$VITE_FEATURE_LISTAGEM_SERVIDOR \
    VITE_FEATURE_HOMOLOGACAO_SERVIDOR=$VITE_FEATURE_HOMOLOGACAO_SERVIDOR \
    VITE_FEATURE_SITUACAO_CLIENTE=$VITE_FEATURE_SITUACAO_CLIENTE

RUN npm run build

# Estágio 2: Produção
# Imagem sem privilégios: o processo roda como o usuário "nginx" (não root) e já escuta em 8080.
FROM nginxinc/nginx-unprivileged:alpine
USER root
RUN apk update && apk upgrade --no-cache
# Copia o build gerado para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Copia uma configuração customizada do Nginx (para lidar com rotas do React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
