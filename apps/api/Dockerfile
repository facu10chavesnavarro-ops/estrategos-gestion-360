# syntax=docker/dockerfile:1
#
# Build desde la RAÍZ del monorepo (contexto = repo root), no desde apps/api:
#   docker build -f apps/api/Dockerfile -t estrategos-api .
# Es un workspace de npm con un único package-lock.json — no se puede
# instalar el árbol de dependencias de apps/api de forma aislada.

FROM node:20-bookworm AS deps
WORKDIR /app
# node-gyp (argon2 compila su binding nativo en esta imagen) necesita
# python3/make/g++, que node:20-bookworm no trae por defecto.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# Solo los manifests primero: capa de node_modules cacheable mientras no
# cambien las dependencias, aunque cambie el código fuente.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM node:20-bookworm AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=apps/api

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json ./apps/api/package.json
COPY package.json ./package.json

RUN groupadd -r estrategos && useradd -r -g estrategos -m estrategos \
    && chown -R estrategos:estrategos /app
USER estrategos

EXPOSE 3001
# Antes de arrancar por primera vez (o tras cada deploy con migraciones
# nuevas) correr, dentro del contenedor o como job separado:
#   npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
CMD ["node", "apps/api/dist/main.js"]
