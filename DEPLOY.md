# Despliegue a producción

> **Estado de esta guía**: los Dockerfiles y `docker-compose.yml` están
> escritos y cada paso individual que ejecutan fue verificado por separado
> (`npm ci`/`npm install` del workspace completo, `npx prisma generate
> --schema apps/api/prisma/schema.prisma` desde la raíz del repo, `npm run
> build --workspace=apps/api`, `npm run build --workspace=apps/web` con
> `output: 'standalone'` — se inspeccionó la estructura real generada para
> escribir las rutas del Dockerfile, no se asumieron). Lo que **no** se pudo
> verificar en esta sesión es la ejecución completa de `docker build` /
> `docker compose up`: el daemon de Docker Desktop no llegó a responder en
> este entorno pese a que el proceso corría. **Antes de depender de esto
> para un deploy real, corré una vez `docker compose up --build` en una
> máquina donde Docker funcione** (la tuya, o un runner de CI) y confirmá
> que los tres servicios levantan y responden — ver el checklist al final.

## 1. Qué falta para "empezar a usarlo"

El desarrollo funcional (F0–F8) y la auditoría de seguridad (Crítico/Alto
cerrados, Medio/Bajo mayormente cerrados — ver `CHANGELOG.md` y el
historial de commits `fix(api): ...`) ya están listos. Lo que quedaba
exclusivamente para poder desplegar es lo que agrega esta guía:

- [x] `Dockerfile` de `apps/api` y `apps/web` (build multi-stage, imagen de
      runtime sin herramientas de build).
- [x] `docker-compose.yml` (Postgres + migración + API + Web, red interna).
- [x] `.env.production.example` en `apps/api` y `apps/web`.
- [x] Pin de versión de Node (`.nvmrc`, `engines` en los 3 `package.json`).
- [ ] **Elegir dónde corre esto** (ver sección 3) — es la única decisión
      que queda en tus manos, no hay forma de tomarla por vos.
- [ ] Secretos reales de producción (`JWT_SECRET`, `JWT_REFRESH_SECRET`,
      credenciales de la base) — nunca generados ni vistos por esta sesión.
- [ ] Backups automáticos de Postgres — depende de qué hosting elijas (la
      mayoría de los managed Postgres los incluyen).

## 2. Variables de entorno requeridas

### `apps/api/.env.production` (copiar desde `.env.production.example`)

| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | Sí | Si usás el `docker-compose.yml` de este repo tal cual, se pisa automáticamente con la del servicio `postgres` interno — no hace falta completarla salvo que apuntes a un Postgres externo. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Sí | Generar cada uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Deben ser distintos entre sí y de cualquier valor de dev/test. Rotarlos invalida todas las sesiones activas. |
| `CORS_ORIGIN` | Recomendada | Dominio real del frontend, sin barra final. Si se omite, el API rechaza todo acceso cross-origin del navegador por defecto (fail-closed, hallazgo Medio #5 de la auditoría). |
| `PORT` | No | Default 3001. |

### `apps/web/.env.production` (copiar desde `.env.production.example`)

| Variable | Obligatoria | Notas |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sí | **Se incrusta en el bundle en tiempo de BUILD** (convención `NEXT_PUBLIC_*` de Next.js) — cambiarla requiere reconstruir la imagen, no alcanza con cambiar la env var del contenedor corriendo. Con el Dockerfile de este repo se pasa como `--build-arg`, no leyendo este archivo (ver `docker-compose.yml`). |

## 3. Dónde correr esto — opciones

No hay una respuesta única; dependen de presupuesto y cuánto querés
administrar vos mismo. Ninguna de las tres requiere cambios de código.

**A. Un solo VPS con `docker compose`** (más simple, más barato, más para administrar vos)
```bash
git clone <tu-repo> && cd estrategos-gestion-360
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
# completar los dos .env.production con valores reales
docker compose up --build -d
```
Sumale un reverse proxy con HTTPS (Caddy o nginx + certbot) delante de los
puertos 3000 (web) y 3001 (api), y backups periódicos del volumen
`estrategos_postgres_data` (o mejor, de un Postgres externo — ver B).

**B. Servicios administrados separados** (menos para administrar, más caro)
Web en Vercel (soporta Next.js nativamente, no necesita el Dockerfile) +
API en Railway/Render/Fly.io (sí usan el `Dockerfile` de `apps/api`) +
Postgres administrado (Neon, Supabase, RDS, o el Postgres del mismo
Railway/Render) con backups automáticos incluidos.

**C. Kubernetes / orquestador propio**
Las imágenes ya son standalone y sin estado (salvo Postgres) — deployable
como Deployments comunes. Fuera del alcance de esta guía.

## 4. Migraciones de base de datos

`docker-compose.yml` ya corre `prisma migrate deploy` automáticamente
antes de levantar la API (servicio `migrate`, se ejecuta una vez y
termina). Si desplegás la API por fuera de este `docker-compose.yml`
(opción B), corré manualmente antes de cada deploy con migraciones nuevas:
```bash
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```
`migrate deploy` (a diferencia de `migrate dev`, que es solo para
desarrollo) aplica migraciones ya generadas sin crear ninguna nueva ni
pedir confirmación — es seguro correrlo en un pipeline de CI/CD.

## 5. Checklist de verificación antes de ir a producción

- [ ] `docker compose up --build` levanta los 3 servicios sin errores (**pendiente de correr en un entorno con Docker funcionando** — ver nota al principio de este documento).
- [ ] `curl http://localhost:3001/api/v1` responde (o el equivalente en tu dominio real).
- [ ] La web carga en `http://localhost:3000` y el login funciona end-to-end.
- [ ] `JWT_SECRET`/`JWT_REFRESH_SECRET` son valores generados para producción, no los de `.env`/`.env.test`.
- [ ] `CORS_ORIGIN` apunta al dominio real del frontend.
- [ ] `NEXT_PUBLIC_API_URL` apunta al dominio real del API (y la imagen de `apps/web` se construyó DESPUÉS de fijar ese valor).
- [ ] HTTPS habilitado en el dominio público (reverse proxy o el propio hosting).
- [ ] Backups automáticos de Postgres configurados.
- [ ] `apps/api/.env.production` y `apps/web/.env.production` existen localmente pero NO están commiteados (`git status` no debe mostrarlos).
