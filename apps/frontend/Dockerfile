# Estágio 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Estágio 2: Produção
FROM nginx:alpine
# Copia o build gerado para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Copia uma configuração customizada do Nginx (para lidar com rotas do React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]