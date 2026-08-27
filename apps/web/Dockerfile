# syntax=docker/dockerfile:1.7
#
# Imagen de producción para @estrategos/web (Next.js 14, App Router).
#
# El build context es la RAÍZ del monorepo (por los workspaces de npm):
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://tu-api.example.com \
#     -t estrategos-web .
#
# Nota: no se usa `output: 'standalone'` para no tocar next.config.js (código
# de la app). La imagen final arranca con `next start` sobre node_modules de
# producción. Migrar a 'standalone' en un PR aparte reduciría bastante el tamaño.

ARG NODE_VERSION=20.18.1

# --------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --------------------------------------------------------------------------
FROM base AS deps
# --include=dev fuerza las devDependencies (nest/next/prisma/tsc) aunque el
# stage herede NODE_ENV=production, que en npm implica omit=dev. NO se baja
# NODE_ENV a development: `next build` con NODE_ENV=development carga a la vez
# los runtimes dev y prod de Next y el prerender revienta con
# "Cannot read properties of null (reading 'useContext')".
COPY package.json package-lock.json ./
COPY apps/api/package.json               apps/api/package.json
COPY apps/web/package.json               apps/web/package.json
COPY packages/shared-types/package.json  packages/shared-types/package.json
RUN npm ci --include=dev

# --------------------------------------------------------------------------
FROM deps AS build
# NEXT_PUBLIC_* se hornea en el bundle en build-time. Para cambiarla: rebuild.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
# El hook `prebuild` intenta regenerar los tipos desde la API y, si no
# responde, cae en los tipos ya commiteados (es offline-safe por diseño).
RUN npm run build --workspace=apps/web \
 && mkdir -p apps/web/public

# --------------------------------------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json               apps/api/package.json
COPY apps/web/package.json               apps/web/package.json
COPY packages/shared-types/package.json  packages/shared-types/package.json
RUN npm ci --omit=dev

# --------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=prod-deps --chown=node:node /app/node_modules            ./node_modules
# shared-types se consume como código TS vía `transpilePackages`; Next lo
# necesita resuelto también en runtime.
COPY --from=build --chown=node:node /app/packages/shared-types       ./packages/shared-types
COPY --from=build --chown=node:node /app/apps/web/.next              ./apps/web/.next
COPY --from=build --chown=node:node /app/apps/web/public             ./apps/web/public
COPY --from=build --chown=node:node /app/apps/web/next.config.js     ./apps/web/next.config.js
COPY --from=build --chown=node:node /app/apps/web/package.json       ./apps/web/package.json
COPY --chown=node:node package.json ./package.json

USER node
EXPOSE 3000

# Invocación directa de Next (evita resolver el workspace con npm en runtime).
# `next start apps/web` lee apps/web/.next y apps/web/next.config.js; PORT sale
# del entorno.
CMD ["node", "node_modules/next/dist/bin/next", "start", "apps/web"]
