# Frontend — Arquitectura propuesta

> Estado: **pendiente de tu aprobación**. No se escribe código de frontend
> hasta resolver la sección 6 (checklist de decisiones). Este documento
> asume aprobado el Backend v1.0 (`docs/ARQUITECTURA.md`, `docs/sprint-*/`)
> y la API documentada en `/api/docs` (Swagger/OpenAPI, v1.0.1).

## 0. Punto de partida (lo que ya existe, no se descarta)

`apps/web` tiene un esqueleto Next.js 14 (App Router) de Sprint 0, con una
identidad visual ya empezada que **este documento adopta y formaliza**, no
reemplaza:

- `apps/web/src/app/globals.css`: paleta "libro contable" — `--ink`
  (#16233a), `--paper` (#faf8f3, fondo tipo papel), `--ledger-green`
  (#2e6f5e, acento), `--line` (#d8d2c4), `--danger` (#a13d2e), tipografía
  sans para texto y mono para etiquetas/códigos. La pantalla de login usa
  una textura de "renglones de libro contable" de fondo.
- `apps/web/src/app/login/`: formulario de login funcional contra
  `POST /auth/login`, sin persistir todavía el token (comentario explícito
  en el código: es trabajo de Sprint 1 en adelante).
- `apps/web/next.config.js`: rewrite de `/api/backend/:path*` hacia la API
  NestJS — base ya puesta para el patrón BFF de la §2.3.
- `packages/shared-types` (workspace vacío): reservado para tipos
  compartidos entre `apps/api` y `apps/web` — la §2.5 decide qué va ahí.
- Backend: JWT (access corto + refresh rotable), multi-empresa por
  usuario vía `CompanyUser`, cada endpoint de datos exige el encabezado
  `X-Company-Id` (validado por `CompanyContextGuard` contra la membresía
  activa del usuario) además del JWT. 91 endpoints documentados en
  `/api/docs-json`.

## 1. Alcance de este documento

Cubre el punto 2 de tu pedido ("documento de arquitectura del frontend").
Los puntos 3, 4 y 5 (organización de módulos/rutas/estado, navegación/UX,
plan de sprints) están en `01-organizacion-y-estado.md`,
`02-navegacion-y-ux.md` y `03-plan-de-implementacion.md` — construidos
sobre las decisiones de este documento, así que su detalle fino depende de
que la §6 se apruebe tal como está o con tus ajustes.

## 2. Decisiones de arquitectura

### 2.1 Fundación de UI: Tailwind CSS + shadcn/ui

**Decisión:** Tailwind CSS como capa de estilos, más shadcn/ui como fuente
de componentes accesibles (diálogo, combobox, dropdown, toast, tabla,
tabs, etc.).

**Por qué no lo que ya hay (estilos inline) ni una librería "de vidriera"
(MUI/Ant/Chakra):**
- Los estilos inline de `login-form.tsx` no escalan a un ERP con docenas
  de formularios y tablas — no hay forma de reusar variantes ni mantener
  consistencia sin repetir objetos de estilo en cada archivo.
- shadcn/ui no es una dependencia en el sentido tradicional: genera los
  componentes **dentro del repo** (`apps/web/src/components/ui/`), como
  código propio editable. Esto es clave para no perder la identidad
  "libro contable" ya diseñada — se reskinea con las variables CSS
  existentes (`--ink`, `--paper`, `--ledger-green`, etc.) en vez de pelear
  contra el tema por defecto de una librería cerrada como MUI/Ant.
- Las primitivas de Radix (debajo de shadcn/ui) resuelven accesibilidad
  (foco, teclado, ARIA) para los componentes que un ERP necesita de verdad
  — combobox de cliente/ítem con búsqueda, modales de confirmación,
  selects — sin tener que construirlos a mano.

### 2.2 Datos de servidor: TanStack Query

**Decisión:** TanStack Query (React Query) para todo fetch/mutación contra
la API — listas, detalle, creación, actualización, activar/desactivar.

**Por qué:** el 90% del estado de esta aplicación es "una copia en caché
de algo que vive en el backend" (clientes, comprobantes, saldos, asientos).
TanStack Query da invalidación de caché por clave, reintentos, estados de
carga/error consistentes y actualizaciones optimistas — sin esto, cada
pantalla reinventa `useEffect` + `useState` + manejo de carrera de
peticiones a mano (que es exactamente el patrón que ya hay que evitar
según se ve en `login-form.tsx`, aceptable para un único formulario de
Sprint 0 pero no para ~90 endpoints).

### 2.3 Autenticación y sesión: Next.js como BFF con cookies httpOnly

**Decisión:** los Route Handlers de Next.js (`apps/web/src/app/api/...`)
actúan como intermediario ("BFF") entre el navegador y la API NestJS. El
navegador nunca ve el JWT: `/api/backend/*` (ya hay un rewrite para esto)
se reemplaza por Route Handlers reales que:
1. Leen el access/refresh token de cookies `httpOnly`, `Secure`,
   `SameSite=Lax`.
2. Agregan `Authorization: Bearer <token>` y `X-Company-Id` (leído de la
   URL, ver §2.4) antes de reenviar la petición a la API real.
3. Si el access token expiró, llaman a `/auth/refresh` con el refresh
   token, rotan las cookies, y reintentan — transparente para el cliente.

**Alternativa descartada:** guardar el JWT en memoria del cliente
(Zustand/Context) y llamar a la API NestJS directo desde el navegador.
Es más simple de construir (sin capa intermedia) pero dado que este es un
sistema financiero (montos, cuentas corrientes, asientos contables), el
costo de un token robado por una dependencia de frontend comprometida
(ataque de cadena de suministro, no hipotético) es alto. Cookies
`httpOnly` no eliminan XSS pero sí eliminan la vía más común de robo de
token (`document.cookie` / `localStorage` leído por JS inyectado).

**Costo de esta decisión:** cada llamada a la API pasa por un salto de red
adicional (navegador → Next.js → NestJS) en vez de ir directo. Para el
volumen de este sistema (uso interno de una consultora y sus clientes, no
tráfico masivo público) es una latencia aceptable a cambio de la
superficie de ataque reducida.

### 2.4 Selección de empresa: segmento de URL

**Decisión:** toda ruta autenticada vive bajo `/[companyId]/...` (ej.
`/a1b2c3.../clientes`, `/a1b2c3.../comprobantes/nuevo`). El `companyId` de
la URL es lo que el Route Handler BFF reenvía como `X-Company-Id` — nunca
un valor "recordado" en un store de cliente que pueda desincronizarse de
lo que el usuario realmente está mirando.

**Por qué:** el backend ya modela "una petición, una empresa" (el guard
exige `X-Company-Id` en cada llamada). Reflejar eso en la URL da enlaces
compartibles/reutilizables (abrir el mismo comprobante en otra pestaña
funciona sin pasos previos), permite que Server Components pidan datos
del lado del servidor sabiendo la empresa antes de hidratar nada en el
cliente, y hace estructuralmente imposible el bug de "estoy mirando datos
de la empresa A pero mi próxima acción pega contra la empresa B" que sí es
posible si la empresa activa vive solo en un store en memoria.

Después de `/login`, un usuario con una sola empresa autorizada entra
directo a `/[companyId]/inicio`; con más de una, ve un selector
(`/seleccionar-empresa`) y de ahí navega a la URL con el id elegido.

### 2.5 Tipos compartidos: generados desde el OpenAPI del backend

**Decisión:** `packages/shared-types` deja de estar vacío y pasa a
contener tipos TypeScript **generados** (no escritos a mano) a partir de
`apps/api`'s `/api/docs-json`, vía `openapi-typescript`, como un paso de
build (`npm run generate:types --workspace=packages/shared-types`, corrido
en desarrollo y en CI).

**Por qué:** con la documentación Swagger recién completada (v1.0.1), cada
DTO del backend ya tiene un esquema preciso. Generar tipos desde ahí evita
la clase de bug más común en un monorepo full-stack — el frontend
duplicando a mano un tipo que se desincroniza silenciosamente del DTO real
del backend — sin costo adicional de mantenimiento (se regenera, no se
edita).

### 2.6 Formularios: React Hook Form + Zod

**Decisión:** todo formulario (alta/edición de cualquier entidad,
comprobantes con líneas dinámicas, pagos con medios múltiples) usa React
Hook Form para el estado del formulario y Zod para validación, con el
esquema Zod espejando las reglas ya impuestas por los DTOs `class-
validator` del backend (no hay una única fuente de verdad automática
entre ambos todavía — ver nota de alcance abajo).

**Por qué:** el patrón manual de `login-form.tsx` (un `useState` por
campo) es razonable para 2 campos; no escala a un formulario de
Comprobante con N líneas, cada una con ítem/cantidad/precio/descuento, o
a un Pago con M medios de pago cada uno con su propio detalle
condicional (cheque/tarjeta). RHF maneja arrays de campos y validación
por campo sin re-renderizar todo el formulario en cada tecla.

**Nota de alcance:** este sprint no incluye generar los esquemas Zod
automáticamente desde los DTOs del backend (sería un paso más de
codegen, evaluable a futuro); se escriben a mano espejando las reglas
documentadas, con el riesgo de desincronización manual que eso implica —
mitigado por el hecho de que el backend siempre re-valida igual (nunca
confía en la validación del cliente).

## 3. Stack técnico resultante

| Capa | Elección | Versión de referencia |
|---|---|---|
| Framework | Next.js (App Router) | 14.x (ya en `apps/web`) |
| Lenguaje | TypeScript | 5.x (ya en `apps/web`) |
| Estilos | Tailwind CSS | 3.x |
| Componentes | shadcn/ui (sobre Radix UI) | — (código generado en el repo) |
| Datos de servidor | TanStack Query | 5.x |
| Estado de cliente (UI) | Zustand | 4.x |
| Formularios | React Hook Form + Zod | — |
| Tablas | TanStack Table (sobre los mismos primitivos de shadcn) | 8.x |
| Íconos | lucide-react (el set que trae shadcn/ui por defecto) | — |
| Tipos compartidos | `packages/shared-types`, generados con `openapi-typescript` | — |
| Tests de componentes | Vitest + Testing Library | — |
| Tests end-to-end | Playwright | — |

**Zustand** (mencionado en la tabla, no desarrollado como decisión
separada en la §2 porque es de bajo riesgo): un store chico para estado
de UI que sí necesita ser compartido entre componentes lejanos y persistir
entre navegaciones — sesión de usuario (nombre, empresas autorizadas),
estado del sidebar (colapsado/expandido), preferencias de tabla (columnas
visibles). Todo lo que es "una copia de datos del backend" NO vive acá,
vive en TanStack Query.

## 4. Estructura de carpetas (resumen — detalle completo en `01-organizacion-y-estado.md`)

```
apps/web/src/
  app/
    (public)/              # login, recuperar contraseña, aceptar invitación
    (authenticated)/
      seleccionar-empresa/
      [companyId]/
        inicio/
        clientes/
        proveedores/
        catalogo/
        stock/
        comprobantes/
        tesoreria/
        caja-bancos/
        contabilidad/
        configuracion/
    api/                    # Route Handlers (BFF, ver §2.3)
  components/
    ui/                     # shadcn/ui (generado)
    layout/                 # shell autenticado: sidebar, topbar, selector de empresa
    <dominio>/              # componentes específicos de un módulo (ver doc 01)
  lib/
    api/                    # cliente HTTP + hooks de TanStack Query por módulo
    auth/                   # lectura de sesión, guards de ruta
    stores/                 # stores Zustand
  hooks/
packages/shared-types/
  src/generated/            # salida de openapi-typescript (no editar a mano)
```

## 5. Rendimiento, accesibilidad y seguridad (lineamientos transversales)

- **Server Components por defecto**, `'use client'` solo donde hay
  interactividad real (formularios, tablas con ordenamiento/filtro en
  vivo, diálogos). Las listas iniciales de cada pantalla se resuelven en
  el servidor cuando es razonable, para evitar el parpadeo de "cargando"
  en la carga inicial de página.
- **Accesibilidad**: al heredar Radix vía shadcn/ui, foco/teclado/ARIA de
  los componentes interactivos vienen resueltos; queda como
  responsabilidad del desarrollador mantener contraste de color (la
  paleta actual ya es de alto contraste) y etiquetas de formulario
  explícitas (como ya hace `login-form.tsx`).
- **Seguridad**: ninguna clave/token en `localStorage` (§2.3); todo dato
  sensible sale del BFF, nunca se arma en el cliente; los formularios que
  tocan dinero (comprobantes, pagos, asientos) siempre re-validan contra
  la respuesta real del backend antes de mostrar éxito — nunca se asume
  éxito optimista en una operación financiera irreversible.
- **Manejo de errores**: la API ya devuelve mensajes de error en español,
  pensados para mostrarse directo al usuario (patrón usado desde
  `ApiError` en `api-client.ts`) — se mantiene ese contrato en el cliente
  HTTP nuevo.

## 6. Checklist de decisiones que requieren tu aprobación explícita

| # | Decisión | Mi recomendación | Tu resolución |
|---|---|---|---|
| 2.1 | Tailwind CSS + shadcn/ui como fundación de UI (reskineado con la paleta "libro contable" existente) | Sí | ⬜ |
| 2.2 | TanStack Query para todo el estado de servidor | Sí | ⬜ |
| **2.3** | **Next.js como BFF con cookies httpOnly para el JWT (en vez de guardar el token en el cliente)** | **Sí — el costo en latencia es aceptable frente al riesgo de un sistema financiero** | ⬜ **— requiere tu respuesta explícita** |
| **2.4** | **Selección de empresa vía segmento de URL (`/[companyId]/...`), no solo un store en memoria** | **Sí — coherente con que el backend exige `X-Company-Id` por petición** | ⬜ **— requiere tu respuesta explícita** |
| 2.5 | Generar `packages/shared-types` desde el OpenAPI del backend, en vez de tipos escritos a mano | Sí | ⬜ |
| 2.6 | React Hook Form + Zod para formularios | Sí | ⬜ |

Quedo a la espera de tu aprobación (o tus ajustes) sobre este documento,
con especial atención a las decisiones 2.3 y 2.4 por su impacto en
seguridad y en la forma de toda la navegación autenticada, antes de
programar cualquier pantalla del frontend.
