# Frontend Sprint F1 — Configuración: Empresa, Sucursales, Usuarios

> Depende de `00-arquitectura-frontend.md`, `01-organizacion-y-estado.md`,
> `02-navegacion-y-ux.md` y `03-plan-de-implementacion.md`. Mapea 1:1 los
> módulos `companies` y `users` del Backend v1.0.1 — contrato ya estable
> (`/api/docs`), sin descubrimiento de reglas de negocio pendiente. Este
> documento fija el detalle de implementación antes de escribir código,
> siguiendo el mismo criterio de "documentar antes de programar" usado en
> todo el proyecto.

## 1. Alcance (de `03-plan-de-implementacion.md`)

- `configuracion/empresa/`: editar datos de la empresa, CRUD de
  sucursales (alta, edición, activar/desactivar).
- `configuracion/usuarios/`: miembros de la empresa (listar, cambiar rol,
  activar/desactivar), invitaciones (crear, listar, revocar).
- `(public)/invitaciones/[token]/`: pantalla pública de aceptar invitación.
- **Entregable**: administrar la empresa y su equipo de punta a punta.
  E2E: invitar a un usuario, aceptar la invitación, verlo listado como
  miembro activo.

## 2. Decisiones técnicas de implementación

Estas son decisiones de UI/implementación dentro del alcance y la
arquitectura ya aprobados (no cambian seguridad, modelo de datos ni
alcance funcional), así que se documentan y se avanza directamente.

### 2.1 Cómo resolver "mi rol en la empresa activa"

El backend no tiene un endpoint dedicado tipo `/companies/:id/me`.
`GET /me/companies` no incluye rol (se confirmó relevando
`prisma-company.repository.ts::findAllForUser`, que descarta
`roleId`/`roleName` de la membresía). El JWT tampoco lo lleva (solo firma
`{ sub, email }`).

**Decisión**: usar `GET /companies/:companyId/members` — accesible para
**cualquier miembro activo** (no tiene `assertRoleIn`, a diferencia de
las mutaciones) — y buscar la fila cuyo `userId` coincide con
`useSessionStore().user.id`. Se expone como un hook
`useCurrentMembership()` (TanStack Query, cacheado por `companyId`) en
`lib/api/users.ts`, reutilizado por el layout de Configuración y por
cualquier pantalla futura que necesite gatear UI por rol.

Es un llamado extra (ya se paga en la propia pantalla de Miembros, que
necesita esa lista de todos modos), no un cambio de arquitectura. Si en
un sprint futuro el volumen de miembros o la latencia lo justifican, se
puede pedir al backend un endpoint dedicado — no bloquea F1.

### 2.2 Estructura de "Configuración" en la navegación

El Sidebar de F0 es una lista plana (sin submenús). En vez de agregar esa
capacidad al Sidebar para un solo caso, "Configuración" pasa a ser una
sección con su **propio layout** y una navegación secundaria (tabs
`Empresa | Usuarios`) dentro de la página, siguiendo el mismo patrón de
"un layout envuelve subrutas relacionadas" ya usado para
`(authenticated)/[companyId]/`.

La pestaña **Usuarios** se oculta (no se deshabilita: no se muestra) si
`useCurrentMembership().roleName` no está en
`ROLES_THAT_CAN_MANAGE_COMPANY` (mismo set que valida el backend:
`Administrador Estrategos`, `Propietario`, `Administrador de empresa`) —
aplica el principio ya fijado en `02-navegacion-y-ux.md` §1 ("evitar
callejones sin salida es parte de intuitivo"), ahora que hay una pantalla
real a la que aplicarlo.

**Empresa** no se oculta para ningún rol: ver los datos de la empresa y
la lista de sucursales no está restringido en el backend (solo las
mutaciones lo están). Dentro de la pantalla, si el usuario no tiene rol
de gestión, el formulario se muestra de solo lectura y los controles de
sucursales (alta/edición/activar/desactivar) no se renderizan.

### 2.3 Token de invitación: única oportunidad de copiarlo

`POST /invitations` devuelve el `token` en texto plano **una sola vez**
(el backend solo persiste el hash). El diálogo de "+ Invitar" muestra el
link completo (`${origin}/invitaciones/${token}`) con un botón de copiar
inmediatamente después de crear la invitación, con una nota de que no se
podrá recuperar después — es la única vía si el email de notificación
fallara o no llegara.

### 2.4 Formulario de aceptar invitación: `fullName` siempre requerido

El DTO del backend marca `fullName` como opcional porque solo es
obligatorio *si el usuario todavía no existe* (si ya existe una cuenta
con ese email, se ignora tanto `fullName` como `password`). El frontend
no tiene forma de saber de antemano cuál de los dos casos aplica
(`GET /invitations/:token` no lo informa), así que el formulario pide
`fullName` y `password` (mínimo 8) siempre como requeridos — en el peor
caso (el usuario ya existía) el backend simplemente ignora esos datos sin
error.

## 3. Rutas y componentes

```
(authenticated)/[companyId]/configuracion/
  layout.tsx              # tabs "Empresa" | "Usuarios" (oculta "Usuarios" según rol)
  empresa/
    page.tsx               # formulario de datos + tabla de sucursales
  usuarios/
    page.tsx                # tabs internas "Miembros" | "Invitaciones"

(public)/invitaciones/[token]/
  page.tsx                   # Server Component: preview + formulario de aceptar

components/shared/            # nuevos, primer uso real (F0 no tenía listados)
  data-table.tsx               # wrapper de TanStack Table: columnas, sort, filtro
                                 # cliente, variante de lista de tarjetas en móvil
                                 # (02-navegacion-y-ux.md §6 — se define una vez acá)
  status-badge.tsx             # activo/inactivo + pendiente/aceptada/revocada/vencida
  confirm-dialog.tsx           # confirmación de acciones irreversibles, con campo de
                                 # motivo opcional (lo usan branches/company, no members)

components/configuracion/
  company-form.tsx
  branch-sheet.tsx             # alta/edición de sucursal
  members-table.tsx
  invitations-table.tsx
  create-invitation-dialog.tsx

lib/api/
  companies.ts    # se amplía: useCompany, useUpdateCompany, useBranches,
                    # useCreateBranch, useUpdateBranch, useActivateBranch,
                    # useDeactivateBranch (ya existía fetchMyCompanies/useMyCompanies)
  users.ts        # useCurrentMembership, useMembers, useChangeMemberRole,
                    # useActivateMember, useDeactivateMember, useInvitations,
                    # useCreateInvitation, useRevokeInvitation, useRoles
  invitations-public.ts  # fetchInvitationPreview, acceptInvitation — fuera de
                           # TanStack Query, mismo criterio que auth.ts (sin sesión)
```

Tipos: los DTOs de request de `companies`/`users` se generan bien en
`shared-types` (son clases `*.dto.ts` con propiedades de cuerpo de clase,
el CLI plugin de Swagger sí las infiere). Los **responses** son entidades
de dominio con constructor-parameter properties y llegan vacíos en el
OpenAPI generado (gap ya reportado y flagueado aparte). Se definen
localmente en `lib/api/companies.ts`/`users.ts` — mismo patrón que
`SessionCompany` en F0 — hasta que ese gap se resuelva.

## 4. Casos de uso por pantalla y criterios de aceptación

### 4.1 Configuración → Empresa

Campos editables: razón social* (mín. 2 caracteres), CUIT, condición
fiscal, actividad, dirección, nombre/email/teléfono de contacto, URL de
logo, moneda, huso horario. CUIT se valida en el cliente con el mismo
formato que el backend (`NN-NNNNNNNN-N`, con o sin guiones, 11 dígitos)
para feedback inmediato, pero el mensaje de error final siempre lo decide
el backend (nunca se reescribe).

Sucursales: tabla (nombre, dirección, teléfono, estado, acciones).
"+ Nueva sucursal" abre un `Sheet` (entidad simple de un paso, ver
`02-navegacion-y-ux.md` §2). Activar/desactivar usa `ConfirmDialog` con
motivo obligatorio (mínimo 3 caracteres) — RN-003 del backend exige
motivo en toda desactivación de Company/Branch.

**Criterios de aceptación:**
- AC1: la pantalla carga con los datos actuales de la empresa y su lista
  de sucursales.
- AC2: guardar cambios válidos actualiza los datos y muestra un toast de
  confirmación.
- AC3: guardar con CUIT de formato inválido muestra el mensaje de error
  tal cual lo devuelve el backend.
- AC4: crear una sucursal la agrega a la tabla sin recargar la página.
- AC5: intentar desactivar una sucursal sin motivo (o con menos de 3
  caracteres) no permite confirmar.
- AC6: un usuario sin rol de gestión ve el formulario y la lista de
  sucursales, pero sin ningún control de edición/alta/baja.

### 4.2 Configuración → Usuarios → Miembros

Tabla: nombre, email, rol (select que dispara el cambio al elegir una
opción), estado, acciones. La fila del usuario logueado se distingue
visualmente (ej. "(vos)" al lado del nombre) y no ofrece edición de rol
ni activar/desactivar — RN-USR-12 del backend prohíbe la
auto-modificación, y la UI no debe ofrecer una acción que va a fallar.
Activar/desactivar usa `ConfirmDialog` **sin** campo de motivo (el
backend no lo pide para miembros, a diferencia de empresa/sucursal).

**Criterios de aceptación:**
- AC1: la fila propia nunca muestra acciones de cambiar rol o
  activar/desactivar.
- AC2: cambiar el rol de otro miembro actualiza la tabla sin recargar.
- AC3: desactivar/activar un miembro pide una confirmación simple y
  refleja el nuevo estado.
- AC4: intentar una acción sobre un miembro ya en el estado destino
  (ej. activar a alguien ya activo) no debería ser posible desde la UI
  (el botón correspondiente no se muestra para ese estado).

### 4.3 Configuración → Usuarios → Invitaciones

Tabla: email, rol, estado (`StatusBadge`: pendiente/aceptada/revocada/
vencida), fecha de creación, fecha de vencimiento, acciones ("Revocar",
solo visible si `status === 'pending'`). "+ Invitar" abre un `Dialog`
(email + rol, desde `GET /roles`). Al confirmar, se muestra el link de
invitación completo con botón de copiar (ver decisión 2.3). Revocar usa
`ConfirmDialog` simple, sin motivo.

**Criterios de aceptación:**
- AC1: crear una invitación agrega la fila en estado "pendiente" y
  expone el link para copiar.
- AC2: invitar un email con membresía activa o invitación pendiente
  muestra el error del backend tal cual (`DuplicateActiveMembershipError`/
  `DuplicatePendingInvitationError`).
- AC3: la acción "Revocar" solo aparece en invitaciones pendientes.
- AC4: revocar actualiza el estado a "revocada" sin recargar la página.

### 4.4 (public)/invitaciones/[token] — Aceptar invitación

Server Component: `GET /invitations/:token` (llamada directa al backend,
sin pasar por `/api/backend/*` ya que es pública y no necesita cookies
de sesión) para obtener `companyName`, `roleName`, `email`, `status`.

- Si `status !== 'pending'`: mensaje según el caso (vencida / ya aceptada
  / revocada), sin formulario.
- Si `pending`: "Te invitaron a sumarte a **{companyName}** como
  **{roleName}**" + formulario (nombre completo*, contraseña* mínimo 8,
  ver decisión 2.4).
- Al aceptar (`POST /invitations/:token/accept`): si es exitoso, redirige
  a `/login` con un mensaje de éxito — el backend no devuelve tokens, no
  hay auto-login (ver reporte del relevamiento: "no hay auto-login").

**Criterios de aceptación:**
- AC1: token inexistente muestra un error claro ("esta invitación no
  existe").
- AC2: token con estado no-pendiente muestra el mensaje correspondiente,
  sin formulario.
- AC3: aceptar con datos válidos redirige a `/login` con mensaje de
  éxito.
- AC4: contraseña de menos de 8 caracteres se valida en el cliente antes
  de enviar.

## 5. Estado

Todo lo backend-originado (empresa, sucursales, miembros, invitaciones,
roles, membresía propia) vive en TanStack Query, según la tabla ya
fijada en `01-organizacion-y-estado.md` §4. Los formularios
(`CompanyForm`, `BranchSheet`, `CreateInvitationDialog`, el formulario de
aceptar invitación) usan React Hook Form + Zod, estado local a cada
componente. El filtro de estado en las tablas de Miembros e Invitaciones
va a la URL (query string), igual que el resto del proyecto.

## 6. Fuera de alcance de F1 (diferido explícitamente)

- Puntos de venta y depósitos por sucursal — llegan en F4/F5, cuando
  exista `configuracion/empresa/[branchId]` con tabs (mencionado en
  `03-plan-de-implementacion.md` pero no es parte de este sprint).
- Reenviar invitación por email — no existe endpoint en el backend para
  esto.
- Vista de auditoría en la UI — el backend la registra pero no hay
  pantalla planificada en F1-F8; se evalúa más adelante si se pide.
