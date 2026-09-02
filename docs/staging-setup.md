# Puesta en marcha de STAGING — guía pantalla por pantalla

Complementa [`deploy.md`](deploy.md) (el "por qué" de cada decisión y la
matriz de variables) con los clicks exactos para levantar un staging real
por primera vez. Seguila en orden — cada sección da por hecho que la
anterior ya terminó.

Vas a necesitar: una cuenta de GitHub con acceso a este repo, una cuenta en
Render, una cuenta en Vercel (podés usar "sign in with GitHub" en las dos).

---

## 0. Elegir dónde va la base de datos

Tres opciones válidas — la diferencia real es el free tier, no el motor
(las tres son Postgres administrado):

| | Render Postgres | Neon | Supabase |
|---|---|---|---|
| **Fricción de setup** | **La más baja** — `render.yaml` ya la crea y conecta sola (`DATABASE_URL` automática) | Manual: crear proyecto aparte, copiar connection string a mano | Manual: ídem |
| **Free tier** | Expira a los 30 días (hay que recrearla o pasar a plan pago) | **Persistente**, sin expiración forzada | Persistente, pero el proyecto se **pausa tras ~1 semana sin uso** (hay que "despertarlo" a mano) |
| **Latencia con la API** | La mejor — misma región/plataforma que Render | Buena, un salto de red extra | Buena, un salto de red extra |
| **Extras que no usamos acá** | — | Database branching (útil si más adelante querés un staging por feature) | Auth/Storage/Realtime incluidos (no los necesita este proyecto) |

**Recomendación para arrancar hoy: Render Postgres**, porque el
`render.yaml` de este repo ya la crea y la conecta sin tocar nada — es
literalmente un click menos y cero copy-paste de connection string. Si en
unas semanas el staging sigue vivo y no querés lidiar con la expiración de
30 días, migrar a Neon después es un `DATABASE_URL` nuevo, nada más — no
hace falta decidirlo hoy.

> Si preferís arrancar directamente con Neon o Supabase: creá la base ahí
> primero, copiá el *connection string* (con `sslmode=require`), y saltá
> el paso "Blueprint" de la sección 1 — vas directo a "2.2 Manual" de
> `deploy.md` pegando esa URL en `DATABASE_URL`.

---

## 1. Backend + base de datos en Render (con Blueprint)

1. Entrá a **https://dashboard.render.com** (creá cuenta con GitHub si no
   tenés una — botón **Sign in with GitHub**, autorizá el acceso).
2. Botón **New +** (arriba a la derecha) → **Blueprint**.
3. **Connect a repository**: si es la primera vez, Render pide autorizar
   acceso a tus repos de GitHub — elegí "All repositories" o seleccioná
   puntualmente `estrategos-gestion-360`.
4. Elegí el repo `estrategos-gestion-360` de la lista.
5. Render lee `render.yaml` de la raíz y te muestra un preview con **2
   recursos a crear**: `estrategos-db` (Postgres) y `estrategos-api` (Web
   Service). Revisá que diga eso y click **Apply**.
6. Esperá — Render crea la base primero (tarda ~1 min) y después arranca el
   build del Web Service (tarda varios minutos: instala dependencias,
   compila TypeScript, construye la imagen Docker). Vas a ver logs en vivo.
7. `JWT_SECRET` y `JWT_REFRESH_SECRET` los genera Render solo
   (`generateValue: true` en `render.yaml`) — no hace falta que los cargues
   vos para el backend. `CORS_ORIGIN` queda pendiente (paso 4 más abajo,
   una vez que exista el dominio del frontend).
8. Cuando el build termine y el servicio pase a **Live** (punto verde),
   copiá la URL que te asigna Render — algo como
   `https://estrategos-api.onrender.com`. La vas a necesitar en el paso 2.
9. Verificá que responde: abrí `https://<tu-api>.onrender.com/api/docs` en
   el navegador — deberías ver la documentación Swagger de la API.

> **Free tier de Render**: el servicio se "duerme" tras ~15 min sin
> tráfico — el primer request después de eso tarda 30-60s en responder
> (arranque en frío). Es normal, no es un error.

---

## 2. Frontend en Vercel

1. Entrá a **https://vercel.com** → **Sign in with GitHub** si no tenés
   cuenta.
2. Botón **Add New…** (arriba a la derecha) → **Project**.
3. **Import Git Repository**: si es la primera vez, Vercel también pide
   autorizar el acceso a GitHub — mismo flujo que Render.
4. Elegí `estrategos-gestion-360` de la lista → **Import**.
5. En la pantalla de configuración del proyecto:
   - **Root Directory**: click en **Edit** al lado de "Root Directory" →
     elegí `apps/web`. Esto es importante — sin esto Vercel intenta
     buildear el monorepo entero desde la raíz.
   - **Framework Preset**: debería auto-detectar **Next.js** apenas
     elegís el Root Directory. Si no, seleccionalo a mano.
   - **Build and Output Settings**: dejar todo en los valores por defecto.
6. **Environment Variables** (mismo formulario, más abajo):
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: la URL de Render del paso 1.8 (ej.
     `https://estrategos-api.onrender.com`) — **sin barra final**.
   - Dejá el scope en "Production, Preview, and Development" (default).
7. Click **Deploy**. Primer build tarda unos minutos.
8. Cuando termine, Vercel te da una URL — algo como
   `https://estrategos-gestion-360.vercel.app`. Copiala.

---

## 3. Conectar las dos puntas: CORS

En este proyecto el navegador **nunca llama directo a la API** — todo pasa
por el propio servidor de Next.js (patrón BFF, ver
`apps/web/src/app/api/backend/[...path]/route.ts`), así que no hace falta
tocar ningún header de **CSP** para que se "hablen" entre sí: es tráfico
servidor-a-servidor, no cross-origin desde el navegador. Lo único real que
falta conectar es **CORS del lado de la API**, como defensa en profundidad
por si alguna vez se llama directo (Swagger UI, un futuro cliente):

1. Volvé a Render → tu servicio `estrategos-api` → pestaña **Environment**.
2. Buscá (o agregá) la variable `CORS_ORIGIN`.
3. Valor: la URL de Vercel del paso 2.8, **sin barra final** — ej.
   `https://estrategos-gestion-360.vercel.app`.
4. **Save Changes** → Render redeploya solo el servicio (no hace falta
   rebuild completo, es solo cambio de env var, tarda ~1 min).

Con esto, backend y frontend ya se conocen mutuamente. Confirmá probando
el login (siguiente sección, una vez cargados los datos).

---

## 4. Migraciones y datos de prueba

### Migraciones

No hay paso manual en el deploy normal: el `CMD` de `apps/api/Dockerfile`
corre `prisma migrate deploy` (idempotente — si no hay migraciones
pendientes, no hace nada) antes de levantar la API, tanto en Render como en
docker-compose local. Cada vez que hagas push a `master` con una migración
nueva, Render la aplica sola en el próximo deploy.

Para correrlas a mano (ej. si querés aplicar una migración sin esperar un
deploy completo, o diagnosticar algo):

1. Render → `estrategos-api` → pestaña **Shell** (consola interactiva
   sobre el contenedor corriendo).
2. Ejecutar:
   ```bash
   node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
   ```

### Datos de prueba (seed)

Dos scripts, en orden — **corré primero el 1, después el 2**:

1. **Seed base** (roles, catálogos globales de tipo de comprobante y medio
   de pago, un tenant, la "Empresa Piloto SRL", y el usuario admin):
   ```bash
   npm run prisma:seed --workspace=@estrategos/api
   ```
   Usuario que queda creado: `admin@estrategos.local` / `CambiarEsta123!`.

2. **Seed de demo** (sobre esa misma Empresa Piloto: 3 clientes, 1
   proveedor, 3 ítems/productos, 2 comprobantes de venta ya confirmados —
   para que al entrar haya algo con contenido real, no una empresa vacía):
   ```bash
   npm run prisma:seed:demo --workspace=@estrategos/api
   ```
   Es idempotente: si la Empresa Piloto ya tiene comprobantes cargados
   (por ejemplo porque ya la usaste para probar a mano), no crea nada de
   nuevo ni duplica — lo avisa por consola y sale.

**Cómo correrlos contra la base de Render** desde tu máquina: apuntá
`DATABASE_URL` a la base de Render (Dashboard → `estrategos-db` → *External
Connection String* — la interna no es alcanzable desde fuera de Render) y
corré los dos comandos de arriba localmente:

```bash
cd apps/api
DATABASE_URL="<external-connection-string-de-render>" npm run prisma:seed
DATABASE_URL="<external-connection-string-de-render>" npm run prisma:seed:demo
```

En Windows (PowerShell), en dos pasos:
```powershell
$env:DATABASE_URL = "<external-connection-string-de-render>"
npm run prisma:seed
npm run prisma:seed:demo
```

## 5. Checklist final de esta guía

- [ ] `estrategos-api` en Render está **Live** y `/api/docs` responde.
- [ ] `estrategos-web` en Vercel está desplegado y carga `/login`.
- [ ] `CORS_ORIGIN` en Render apunta al dominio real de Vercel.
- [ ] `NEXT_PUBLIC_API_URL` en Vercel apunta al dominio real de Render.
- [ ] Corriste las migraciones + el seed (sección siguiente).
- [ ] Podés loguearte con `admin@estrategos.local` / `CambiarEsta123!` desde
      la URL de Vercel.

Pasame las dos URLs (Render y Vercel) cuando lleguen a este punto y sigo
con el smoke test.
