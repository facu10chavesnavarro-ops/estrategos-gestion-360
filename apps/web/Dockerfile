# syntax=docker/dockerfile:1
#
# Build desde la RAÍZ del monorepo (contexto = repo root), no desde apps/web:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.tu-dominio.com -t estrategos-web .
#
# NEXT_PUBLIC_API_URL se inyecta como build ARG a propósito: Next.js
# incrusta las variables NEXT_PUBLIC_* en el bundle en tiempo de BUILD, no
# de arranque del contenedor — cambiarla requiere reconstruir la imagen,
# no alcanza con cambiar la env var del contenedor en runtime.

FROM node:20-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM node:20-bookworm AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# prebuild intenta regenerar packages/shared-types desde una API corriendo
# en :3001 (no existe durante el build) y cae de nuevo, a propósito, en los
# tipos ya commiteados — ver apps/web/package.json "generate:types".
RUN npm run build --workspace=apps/web

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# output: 'standalone' (next.config.js) empaqueta un server.js propio con
# solo los node_modules realmente usados — no arrastra todo el árbol de
# devDependencies de build (webpack, typescript, etc. quedan afuera).
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

RUN groupadd -r estrategos && useradd -r -g estrategos -m estrategos \
    && chown -R estrategos:estrategos /app
USER estrategos

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
