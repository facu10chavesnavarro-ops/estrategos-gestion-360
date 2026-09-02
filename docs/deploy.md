# Despliegue — Estrategos Gestión 360

Monorepo con dos apps desplegables por separado:

| App                | Stack        | Puerto local | Artefacto                     |
| ------------------ | ------------ | ------------ | ----------------------------- |
| `apps/api`         | NestJS 10 + Prisma 5 | `3001` | `apps/api/Dockerfile` |
| `apps/web`         | Next.js 14 (App Router) | `3000` | `apps/web/Dockerfile` |

Node fijado en **20.18.1** para todo el repo: [`.nvmrc`](../.nvmrc) + `engines` en
cada `package.json`. Usá `nvm use` antes de trabajar localmente.

---

## Opción elegida: Vercel (frontend) + Render (backend + Postgres)

**Frontend → Vercel. Backend + base → Render (con [`render.yaml`](../render.yaml)).**

### Por qué

- **Next.js en Vercel** es el camino de menor fricción: Vercel es la plataforma
  de primera parte de Next, detecta el framework sin config, no necesita
  Dockerfile, da preview deploys por PR y CDN/edge gratis. Cualquier otra opción
  para el front es más trabajo por menos resultado.
- **NestJS en Render** es un *web service* Node estándar: build reproducible
  desde nuestro `Dockerfile`, **Postgres gestionado en la misma plataforma y
  región** (menos latencia, un solo panel), variables de entorno con secretos
  autogenerados, deploy automático por push y health checks incluidos. El
  `render.yaml` deja la infra versionada en el repo.
- **Fly.io** (alternativa más abajo) es más flexible pero mete más ops:
  `fly.toml` por app, volúmenes, la Postgres de Fly es más "hágalo usted mismo".
  Para un web service + base gestionada, Render pide menos.
- **Todo en Render** (front también) también funciona, pero el front en Next
  rinde mejor y con menos config en Vercel, y el free tier de Vercel es amplio.

### Costo / límites del free tier

- Render free: el servicio **se duerme tras ~15 min sin tráfico** (arranque frío
  de ~30–60 s) y la Postgres free **expira a los 30 días** (confirmado en el
  dashboard de Render al crearla — no son 90 como decía una versión anterior
  de esta nota). Para algo real,
  subir `api` a *Starter* y la base a un plan pago. No cambia nada del deploy,
  sólo el `plan:` en `render.yaml`.
- Vercel free (plan Hobby): suficiente para staging y demos.

---

## 1. Local — todo el stack simulando producción

Requiere Docker Desktop.

```bash
cp .env.production.example .env
# editar .env: como mínimo JWT_SECRET y JWT_REFRESH_SECRET
#   openssl rand -base64 48   # una vez por cada secreto
docker compose up --build
```

- Web → http://localhost:3000
- API → http://localhost:3001/api/v1 (Swagger en `/api/docs`)

Las imágenes son las mismas que se despliegan: `NODE_ENV=production`, sin
`devDependencies`, sin watch. La API corre `prisma migrate deploy` sola al
arrancar. Postgres persiste en el volumen `pgdata` (`docker compose down -v`
para borrarlo).

Build de una imagen suelta (context = raíz del repo):

```bash
docker build -f apps/api/Dockerfile -t estrategos-api .
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://tu-api.example.com -t estrategos-web .
```

---

## 2. Backend + base en Render

### 2.1 Con el Blueprint (recomendado)

1. Push de esta rama / merge a `master`.
2. Render → **New +** → **Blueprint** → seleccionar este repositorio.
3. Render lee [`render.yaml`](../render.yaml) y crea:
   - `estrategos-db` (Postgres)
   - `estrategos-api` (web service Docker, build desde `apps/api/Dockerfile`)
   - `JWT_SECRET` y `JWT_REFRESH_SECRET` autogenerados.
4. Cuando exista el frontend, setear en `estrategos-api` →
   **Environment** → `CORS_ORIGIN` = `https://<tu-front>.vercel.app`.
5. Deploy. `DATABASE_URL` la inyecta Render desde la base; el `CMD` de la imagen
   aplica las migraciones antes de levantar.

### 2.2 Manual (sin Blueprint)

1. **New +** → **PostgreSQL** → crear. Copiar la *Internal Connection String*.
2. **New +** → **Web Service** → mismo repo → **Runtime: Docker**,
   *Dockerfile Path* `./apps/api/Dockerfile`, *Docker Context* `.`.
3. Variables de entorno (ver matriz abajo): `DATABASE_URL`, `JWT_SECRET`,
   `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`.
4. *Health Check Path*: `/api/docs-json`.
5. Create Web Service.

### Migraciones

No hay paso manual: el `CMD` de `apps/api/Dockerfile` ejecuta
`prisma migrate deploy` (idempotente) antes de `node dist/main`, tanto en
docker-compose como en Render/Fly. Para correrlas aparte, en una shell de Render:

```bash
node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
```

---

## 3. Frontend en Vercel

1. Vercel → **Add New… → Project** → importar este repo.
2. **Root Directory**: `apps/web`. Vercel detecta Next.js solo.
3. Build & Output: dejar los defaults (`next build`). El monorepo con npm
   workspaces funciona porque Vercel instala desde la raíz.
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://<tu-api>.onrender.com`
     (build-time: si la cambiás, redeploy).
5. Deploy. Después, actualizar `CORS_ORIGIN` en la API de Render con el dominio
   que Vercel asigne.

> El hook `prebuild` intenta regenerar los tipos de `@estrategos/shared-types`
> desde la API y, si no responde, usa los tipos ya commiteados. El build de
> Vercel no necesita la API arriba.

---

## Matriz de variables de entorno

| Variable              | Backend (Render) | Frontend (Vercel) | compose | Notas |
| --------------------- | :--------------: | :---------------: | :-----: | ----- |
| `NODE_ENV=production` | ✅ | ✅ (auto) | ✅ | |
| `DATABASE_URL`        | ✅ (desde la base) | — | auto (`db`) | SSL en gestionado |
| `JWT_SECRET`          | ✅ secreto | — | ✅ | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET`  | ✅ secreto | — | ✅ | distinto de `JWT_SECRET` |
| `CORS_ORIGIN`         | ✅ | — | ✅ | dominio real del front, sin `/` final |
| `PORT`                | inyectado | — | `3001` | no hardcodear en Render/Fly |
| `NEXT_PUBLIC_API_URL` | — | ✅ build-time | ✅ (build arg) | rebuild si cambia |

Plantilla completa y checklist: [`.env.production.example`](../.env.production.example).

---

## Alternativa: todo en Fly.io

Sirve si se quiere un solo proveedor y control total del contenedor.

```bash
# API
fly launch --no-deploy --dockerfile apps/api/Dockerfile --name estrategos-api
fly postgres create --name estrategos-db
fly postgres attach estrategos-db -a estrategos-api      # setea DATABASE_URL
fly secrets set -a estrategos-api \
  JWT_SECRET="$(openssl rand -base64 48)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 48)" \
  CORS_ORIGIN="https://estrategos-web.fly.dev"
fly deploy -a estrategos-api

# Web
fly launch --no-deploy --dockerfile apps/web/Dockerfile --name estrategos-web
fly deploy -a estrategos-web \
  --build-arg NEXT_PUBLIC_API_URL="https://estrategos-api.fly.dev"
```

En Fly el `dockerContext` es el directorio desde el que corrés `fly deploy`, que
debe ser la raíz del repo. `internal_port` en cada `fly.toml`: `3001` (api) y
`3000` (web).
