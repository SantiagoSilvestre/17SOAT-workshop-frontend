# syntax=docker/dockerfile:1

# ---------- Etapa 1: build da aplicação ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Etapa 2: servidor Nginx ----------
FROM nginx:1.29-alpine AS runtime

# Endereço da API para onde o Nginx repassa /api (nome do serviço no docker-compose do backend).
ENV BACKEND_URL=http://app:8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
