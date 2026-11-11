# Estágio 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FEATURE_LISTAGEM_SERVIDOR=false
ARG VITE_FEATURE_HOMOLOGACAO_SERVIDOR=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_FEATURE_LISTAGEM_SERVIDOR=$VITE_FEATURE_LISTAGEM_SERVIDOR \
    VITE_FEATURE_HOMOLOGACAO_SERVIDOR=$VITE_FEATURE_HOMOLOGACAO_SERVIDOR

RUN npm run build

# Estágio 2: Produção
FROM nginx:alpine
# Copia o build gerado para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Copia uma configuração customizada do Nginx (para lidar com rotas do React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
