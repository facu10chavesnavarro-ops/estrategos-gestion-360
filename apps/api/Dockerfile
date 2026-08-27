# syntax=docker/dockerfile:1.7
#
# Imagen de producción para @estrategos/api (NestJS 10 + Prisma 5).
#
# El build context es la RAÍZ del monorepo (por los workspaces de npm):
#
#   docker build -f apps/api/Dockerfile -t estrategos-api .
#
# Etapas:
#   base       -> runtime mínimo (Debian slim + openssl para Prisma)
#   deps       -> node_modules completo (incluye devDeps) para compilar
#   build      -> `prisma generate` + `nest build`
#   prod-deps  -> node_modules de producción + CLI de Prisma + cliente generado
#   runner     -> imagen final: dist + node_modules de prod-deps (copia entera)

ARG NODE_VERSION=20.18.1

# --------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NODE_ENV=production
# openssl y ca-certificates: los engines de Prisma los necesitan en Debian slim.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --------------------------------------------------------------------------
FROM base AS deps
# Toolchain para compilar módulos nativos (argon2) si no hubiera prebuild.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
# Sólo los manifests primero: así la capa de `npm ci` se cachea mientras no
# cambien los package.json. Hay que copiar TODOS los workspaces o npm falla.
# --include=dev: instala las devDependencies (nest-cli, tsc, prisma) aunque el
# stage herede NODE_ENV=production (que en npm implica omit=dev). No se baja
# NODE_ENV a development para no arrastrar ese modo a los builds.
COPY package.json package-lock.json ./
COPY apps/api/package.json               apps/api/package.json
COPY apps/web/package.json               apps/web/package.json
COPY packages/shared-types/package.json  packages/shared-types/package.json
RUN npm ci --include=dev

# --------------------------------------------------------------------------
FROM deps AS build
COPY apps/api ./apps/api
# `prisma generate` antes de `nest build`: el tipado de los servicios depende
# del cliente generado (modelos, Prisma.*).
RUN npx prisma generate --schema apps/api/prisma/schema.prisma \
 && npm run build --workspace=apps/api

# --------------------------------------------------------------------------
FROM base AS prod-deps
# Mismo toolchain que en `deps`: argon2 trae prebuilds para linux/glibc, pero si
# faltara alguno, esta etapa igual compila. No queda en la imagen final (runner
# parte de `base` y sólo copia node_modules).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json               apps/api/package.json
COPY apps/web/package.json               apps/web/package.json
COPY packages/shared-types/package.json  packages/shared-types/package.json
RUN npm ci --omit=dev
# La CLI de Prisma es una devDependency, así que `npm ci --omit=dev` la deja
# afuera. Se reinstala explícitamente en ESTE árbol de node_modules, con versión
# fija y sin escribir en package.json/lock; npm resuelve sus deps transitivas.
# Hace falta en runtime para `prisma migrate deploy`.
RUN npm install --no-save --omit=dev prisma@5.22.0
# Cliente de Prisma generado DENTRO de este mismo árbol: así el runner sólo
# copia node_modules de un stage y no depende de dónde npm hoisteó `.prisma`.
COPY apps/api/prisma ./apps/api/prisma
RUN ./node_modules/.bin/prisma generate --schema apps/api/prisma/schema.prisma

# --------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

# Copia entera de un único stage: node_modules de prod + CLI de Prisma +
# cliente generado, todo resuelto de forma consistente por npm.
COPY --from=prod-deps --chown=node:node /app/node_modules   ./node_modules
COPY --from=build     --chown=node:node /app/apps/api/dist   ./apps/api/dist
COPY --from=prod-deps --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node package.json          ./package.json

USER node
EXPOSE 3001

# `migrate deploy` es idempotente: si no hay migraciones pendientes, no hace
# nada. Se ejecuta antes de levantar la API para que el esquema esté al día.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/main"]
