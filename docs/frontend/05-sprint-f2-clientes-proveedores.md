# Frontend Sprint F2 — Clientes y Proveedores

> Depende de `00-arquitectura-frontend.md`, `01-organizacion-y-estado.md`,
> `02-navegacion-y-ux.md`, `03-plan-de-implementacion.md` y de
> `docs/sprint-2/01-clientes-proveedores.md` (arquitectura del backend:
> modelo `Party`/`Customer`/`Supplier`, motor de importación CSV
> reutilizable). Mapea 1:1 los módulos `customers` y `suppliers` del
> backend — contrato ya estable y verificado (`docs/sprint-2/01-...md` §8),
> sin descubrimiento de reglas de negocio pendiente. Se releva el código
> real (entidades, controllers, DTOs, use cases) antes de escribir este
> documento, mismo criterio que en F1.

## 1. Alcance (de `03-plan-de-implementacion.md`)

- Listado de clientes y de proveedores, con búsqueda y filtro por estado.
- Alta/edición en panel lateral (`Sheet`, por indicación explícita de
  `02-navegacion-y-ux.md` §2: "Cliente, Proveedor" son entidades simples
  de un paso).
- Activar/desactivar.
- Importación por CSV, con feedback de qué filas se crearon/actualizaron/
  omitieron/rechazaron.
- Detalle con la cuenta corriente embebida (aunque el endpoint es de
  `treasury`, mostrarla en el detalle del cliente/proveedor es más
  intuitivo que un módulo aparte — decisión de UX explícita del plan, no
  de arquitectura de datos).
- **Entregable**: alta, edición, baja e importación de clientes y
  proveedores. E2E: crear un cliente, importar un CSV de proveedores,
  desactivar uno y verificar que queda inactivo en el listado (el caso de
  "desaparece del selector de contraparte en Comprobantes" queda diferido
  a F5, como ya indica el plan).

## 2. Relevamiento del contrato backend (resumen)

Ver el documento completo en `docs/sprint-2/01-clientes-proveedores.md`.
Puntos clave para el frontend:

- **Modelo unificado de Terceros**: `Customer`/`Supplier` son vistas
  combinadas de un `Party` compartido (razón social, CUIT, condición
  fiscal, email, teléfono, dirección, contacto, notas) + campos propios
  del rol. El backend ya aplana esto en la respuesta — el frontend nunca
  ve `Party` por separado ni necesita saberlo, salvo para entender un caso
  de UX (§2.3 más abajo).
- **Campos propios de `Customer`**: `paymentTermDays` (días que la
  empresa le da al cliente), `creditLimit` (string decimal, no negativo).
- **Campos propios de `Supplier`**: `paymentTermDays` (días que el
  proveedor le da a la empresa — mismo nombre de campo, significado
  inverso, nunca se comparten componentes de formulario entre ambos por
  esto), `bankName`, `bankAccountHolder`, `bankCbu`.
- **Autorización asimétrica** (RN-TER-12, ya usado en F1 vía
  `ROLES_THAT_CAN_MANAGE_COMPANY`): `GET` (listar/ver) está abierto a
  **cualquier miembro activo** de la empresa; `POST`/`PATCH`/activar/
  desactivar/importar requieren `Administrador Estrategos`, `Propietario`
  o `Administrador de empresa`. Distinto del patrón de F1 donde toda la
  sección "Usuarios" se ocultaba por rol — acá la sección **Clientes/
  Proveedores es visible para todos**, y son los controles de mutación
  los que se ocultan.
- **Activar/desactivar sin motivo**: a diferencia de Empresa/Sucursal
  (RN-003), `Deactivate{Customer|Supplier}UseCase` no pide `reason` —
  mismo patrón que Miembros en F1.
- **Importación CSV**: `POST /companies/:id/customers/import` (y su
  equivalente de `suppliers`) recibe `{ csvContent: string, mode? }` como
  **texto plano en el body JSON**, no `multipart/form-data`. `mode` es uno
  de `'skip-new-only'` (default, rechaza duplicados), `'update-existing'`
  (upsert, audita campos cambiados), `'skip-silently'` (omite duplicados
  sin marcarlos como error). Responde un `ImportSummary`:
  ```ts
  interface ImportSummary {
    totalRows: number;
    created: number;
    updated: number;
    skippedDuplicates: number;
    rejected: Array<{ row: number; reason: string }>;
  }
  ```
- **Cuenta corriente** (`treasury`, no `customers`/`suppliers`):
  `GET /companies/:id/customers/:customerId/current-account` (y su
  equivalente de `suppliers`) devuelve:
  ```ts
  interface CurrentAccountView {
    /* customerId o supplierId según el endpoint */
    currentBalance: string; // '0.00' si nunca tuvo movimientos
    movements: Array<{
      id: string;
      type: 'DEBIT' | 'CREDIT';
      amount: string;
      balanceAfter: string; // snapshot inmutable del saldo en ese momento
      voucherId: string | null;
      paymentId: string | null;
      createdAt: string;
    }>;
  }
  ```
  Sin paginación (devuelve todos los movimientos) — aceptable mientras no
  hay Comprobantes/Pagos reales generando volumen (F5/F6 todavía no
  existen). `voucherId`/`paymentId` no tienen a dónde enlazar todavía —
  se muestran como referencia (id corto) sin link hasta que F5/F6 den de
  alta esas pantallas.
- **Gap de `shared-types` ya conocido**: `CustomerEntity`/`SupplierEntity`
  llegan como `Record<string, never>` en el OpenAPI generado (mismo motivo
  que en F1: son clases con constructor-parameter properties, no
  decoradas con `@ApiProperty`). Se define localmente el tipo en
  `lib/api/customers.ts`/`suppliers.ts`, mismo patrón que `Company`/
  `Member` en F1.

## 3. Decisiones técnicas de implementación

Decisiones de UI/implementación dentro del alcance y la arquitectura ya
aprobados (no cambian seguridad, modelo de datos ni alcance funcional).

### 3.1 Ocultar solo los controles de mutación, no la sección

A diferencia de "Usuarios" en F1 (toda la pestaña se ocultaba), acá
`GET` está abierto a cualquier miembro. Las pantallas de Clientes y
Proveedores son visibles para todos; `useCurrentMembership()` +
`ROLES_THAT_CAN_MANAGE_COMPANY` (reutilizados de `lib/api/users.ts`, sin
duplicar la constante) deciden si se muestran "+ Nuevo", "Importar CSV",
"Editar" y "Activar/Desactivar" — un usuario sin ese rol ve el listado y
el detalle en modo lectura, igual que "Empresa" en F1.

### 3.2 Componentes compartidos entre Clientes y Proveedores

El backend documentó explícitamente (`01-clientes-proveedores.md` §0.1)
la decisión de mantener `customers` y `suppliers` como **módulos de
dominio separados** aunque sean estructuralmente casi idénticos, para no
acoplar su evolución futura. Se replica ese mismo criterio en `lib/api/`
(`customers.ts` y `suppliers.ts` separados, no un archivo genérico
parametrizado) — si mañana Proveedores necesita un campo o regla que
Clientes no, no hay que desarmar una abstracción.

Donde sí conviene compartir es en la **UI**, porque la duplicación ahí es
puramente visual (las diferencias reales son 3 campos: `creditLimit` vs.
`bankName`/`bankAccountHolder`/`bankCbu`) y ya existe precedente de
componentes compartidos en `components/shared/` desde F1:

- `components/parties/party-form-fields.tsx`: los campos comunes del
  formulario (razón social, CUIT, condición fiscal, contacto, notas) como
  fragmento de `FormField`s reutilizado por `CustomerSheet` y
  `SupplierSheet` — cada uno le agrega sus propios campos específicos
  después.
- `components/parties/current-account-panel.tsx`: balance + tabla de
  movimientos, recibe `useQuery` ya resuelto (mismo shape normalizado
  desde ambos hooks) — sin saber si es de un cliente o un proveedor.
- `components/parties/import-dialog.tsx`: selector de archivo + modo +
  resumen de resultado, parametrizado por `entityLabel` (Clientes/
  Proveedores) y la función de importación (`useImportCustomers`/
  `useImportSuppliers`) — el 100% de la lógica de lectura de archivo y
  presentación del resumen es idéntica.

`CustomersTable`/`SuppliersTable` (columnas) y las páginas de listado/
detalle quedan como componentes concretos (mismo criterio que
`MembersTable`/`InvitationsTable` en F1: no generalizar una tabla
"paramétrica por rol" que termine siendo más difícil de leer que dos
tablas concretas de ~40 líneas cada una).

### 3.3 Detalle en página completa, no en el mismo `Sheet` de edición

`02-navegacion-y-ux.md` §2 fija `Sheet` para alta/edición de Cliente/
Proveedor (entidad simple de un paso) — eso se respeta tal cual. Pero
"ver el detalle con la cuenta corriente embebida" no es lo mismo que
"editar": la cuenta corriente puede tener una tabla larga de movimientos,
y meter eso dentro del `Sheet` angosto de edición degradaría esa vista.
Se resuelve con dos superficies distintas para la misma entidad, mismo
criterio que ya separa "página completa" de "panel lateral" en el propio
doc 02 según la complejidad del contenido:

- **Fila de la tabla → clic → página de detalle**
  (`clientes/[customerId]`): datos de solo lectura (Party + rol) +
  `CurrentAccountPanel` embebido + botón "Editar".
- **"Editar" (desde el detalle o desde la tabla) → mismo `Sheet`** que
  "+ Nuevo cliente", precargado — un solo componente de formulario para
  alta y edición, igual que `BranchSheet` en F1.

### 3.4 Importación CSV: lectura del archivo en el cliente

El backend espera `csvContent` como string en el body JSON, no
`multipart/form-data`. El diálogo de importación usa un `<input
type="file" accept=".csv">` y lee el contenido con `FileReader.
readAsText()` en el navegador antes de mandarlo — no hay endpoint de
subida de archivos binarios involucrado, todo el archivo se procesa
client-side como texto y se envía en un solo `POST`. Modo por defecto:
`skip-new-only` (rechaza duplicados), con los otros dos disponibles en un
`Select` con nombres en español claros ("Actualizar existentes",
"Omitir duplicados sin error").

El resultado (`ImportSummary`) se muestra en el mismo diálogo tras
importar: contadores (creados/actualizados/omitidos) + una lista
desplegable de rechazados con su motivo tal cual lo devuelve el backend.
Cerrar el diálogo invalida la query del listado para reflejar los nuevos
registros sin recargar la página.

### 3.5 Sidebar: activar los ítems ya reservados desde F0

`NAV_ITEMS` en `components/layout/nav-items.ts` ya tiene las entradas
"Clientes" (ícono `Users`) y "Proveedores" (ícono `Truck`) sin `href`
desde F0 (se mostraban con un toast "próximamente"). Se les agrega
`href: "clientes"` / `href: "proveedores"` — sin tocar el resto del
archivo ni el componente `SidebarNav`, que ya soporta ambos casos.

## 4. Rutas y componentes

```
(authenticated)/[companyId]/
  clientes/
    page.tsx                    # listado: búsqueda, filtro estado, tabla
    [customerId]/
      page.tsx                   # detalle: datos + CurrentAccountPanel + Editar
  proveedores/
    page.tsx                    # listado: búsqueda, filtro estado, tabla
    [supplierId]/
      page.tsx                   # detalle: datos + CurrentAccountPanel + Editar

components/parties/              # nuevo, compartido entre Clientes y Proveedores
  party-form-fields.tsx          # fragmento de FormField comunes (razón social, CUIT, ...)
  current-account-panel.tsx      # balance + tabla de movimientos
  import-dialog.tsx              # selector de archivo + modo + resumen

components/clientes/
  customers-table.tsx
  customer-sheet.tsx              # alta/edición, usa party-form-fields + campos propios

components/proveedores/
  suppliers-table.tsx
  supplier-sheet.tsx               # alta/edición, usa party-form-fields + campos propios

lib/api/
  customers.ts    # Customer, useCustomers, useCustomer, useCreateCustomer,
                    # useUpdateCustomer, useActivateCustomer, useDeactivateCustomer,
                    # useImportCustomers, useCustomerCurrentAccount
  suppliers.ts    # mismo set para Supplier
```

`query-keys.ts` se amplía con `customers.{list,detail,currentAccount}` y
`suppliers.{list,detail,currentAccount}`, mismo patrón que `companies`/
`users` en F1.

## 5. Casos de uso por pantalla y criterios de aceptación

### 5.1 Clientes → Listado

Tabla (razón social, CUIT, condición de pago, límite de crédito, estado,
acciones) con búsqueda (`?search=`, vía `DataTable` de F1) y filtro por
estado (`Select` activo/inactivo/todos, vía la prop `toolbar` de
`DataTable`, ya soportada desde F1 pero sin usar todavía). "+ Nuevo
cliente" e "Importar CSV" en el `toolbar`, ocultos si el rol no gestiona
(§3.1). Clic en una fila navega al detalle. Activar/desactivar usa
`ConfirmDialog` sin motivo (§2).

**Criterios de aceptación:**
- AC1: la pantalla es visible para cualquier miembro, con o sin rol de
  gestión.
- AC2: un usuario sin rol de gestión no ve "+ Nuevo cliente", "Importar
  CSV" ni acciones de fila.
- AC3: crear un cliente lo agrega al listado sin recargar la página.
- AC4: el filtro de estado y la búsqueda combinan correctamente (`search`
  + `isActive` van juntos a la misma consulta).
- AC5: importar un CSV válido muestra el resumen y refleja los nuevos
  clientes en el listado al cerrar el diálogo.

### 5.2 Clientes → Detalle

Datos del cliente en modo lectura (razón social, CUIT, condición fiscal,
contacto, notas, condición de pago, límite de crédito, estado) + botón
"Editar" (abre `CustomerSheet` precargado) + `CurrentAccountPanel`
(saldo actual + tabla de movimientos: fecha, tipo Debe/Haber, monto,
saldo resultante, referencia).

**Criterios de aceptación:**
- AC1: un cliente sin movimientos muestra saldo `0.00` y la tabla vacía
  con un mensaje claro, no un error.
- AC2: "Editar" abre el mismo formulario que "+ Nuevo cliente",
  precargado con los datos actuales.
- AC3: guardar la edición actualiza el detalle sin recargar la página.
- AC4: un cliente inexistente (id inválido en la URL) muestra un mensaje
  claro, no una pantalla en blanco.

### 5.3 Proveedores → Listado y Detalle

Mismo comportamiento que 5.1/5.2, con las columnas/campos propios de
Proveedor (datos bancarios en vez de límite de crédito) y sus propios
endpoints/hooks.

### 5.4 Importación CSV (Clientes y Proveedores)

Diálogo compartido (`ImportDialog`, §3.4): seleccionar archivo `.csv`,
elegir modo, confirmar. Muestra el `ImportSummary` con contadores y el
detalle de filas rechazadas.

**Criterios de aceptación:**
- AC1: un CSV con filas válidas e inválidas mezcladas reporta cada una
  correctamente (creadas vs. rechazadas con motivo).
- AC2: reintentar la importación con el mismo archivo en modo
  `skip-new-only` rechaza todas las filas como duplicadas (CUIT ya
  existente), sin crear registros repetidos.
- AC3: el modo `update-existing` actualiza los campos que cambiaron y lo
  refleja en el resumen.

## 6. Estado

Todo lo backend-originado (clientes, proveedores, cuentas corrientes)
vive en TanStack Query, según `01-organizacion-y-estado.md` §4. Los
formularios (`CustomerSheet`, `SupplierSheet`) usan React Hook Form +
Zod. El filtro de estado y la búsqueda van a la URL (`?search=`,
`?isActive=`), mismo criterio que el resto del proyecto. El contenido del
archivo CSV leído es estado local efímero del `ImportDialog` (no se
persiste ni pasa por el store de sesión).

## 7. Fuera de alcance de F2 (diferido explícitamente)

- El caso E2E "desactivar una contraparte y verificar que desaparece del
  selector de Comprobantes" — depende de que exista F5. Se agrega como
  test cuando F5 exista, tal como ya lo indica `03-plan-de-implementacion.md`.
- Link directo desde un movimiento de cuenta corriente al Comprobante o
  Pago que lo originó — depende de que existan las pantallas de detalle
  de F5/F6. Se muestra el id como referencia hasta entonces.
- Validación de dígito verificador de CBU — explícitamente fuera de
  alcance también en el backend (`01-clientes-proveedores.md` §0.7).
- Documentos adjuntos (ej. constancia de CUIT escaneada) — Sprint 6 del
  backend (M10), no existe endpoint todavía.

## 8. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npx eslint src e2e`: 0 errores.
- ✅ `npx vitest run`: **9/9 tests** (3 nuevos de `CustomersTable` — sin
  rol de gestión no se ven "Editar"/"Desactivar", desactivar con
  confirmación, "Editar" invoca el callback — + los 6 heredados de F0/F1).
- ✅ `npx playwright test e2e/`: **7/7 tests**, incluyendo el nuevo
  `f2-clientes-proveedores.spec.ts` (crear cliente → importar CSV de 2
  proveedores → verificar ambos en el listado → desactivar uno →
  confirmar que el otro sigue activo) y los 6 de F0/F1 sin regresiones.
- ✅ `npm run build`: build de producción sin errores.
- ✅ Verificación manual en navegador: listado de Clientes (filtro de
  estado, buscador, alta), detalle con `CurrentAccountPanel` mostrando
  saldo `0,00` y "Todavía no hay movimientos" para un cliente sin
  movimientos, `Sheet` de edición precargado con los datos reales.

### Hallazgos durante la verificación (no estaban en el plan)

1. **Bug real encontrado y corregido — mensajes de validación perdidos**:
   el primer intento de crear un cliente en el E2E falló con "Ocurrió un
   error inesperado" en vez de un mensaje útil. Causa raíz: el
   `ValidationPipe` global de Nest devuelve `message` como **array** de
   strings cuando falla más de una regla a la vez, y `apiFetch`
   (`lib/api/http-client.ts`, escrito en F0) solo contemplaba el caso
   `string`. Corregido con `extractMessage` (une el array). Preexistente
   desde F0 — no introducido por F2, pero recién detectado ahora porque
   ningún formulario anterior había disparado dos validaciones a la vez
   en el mismo submit.
2. **Bug real encontrado y corregido — campos opcionales vacíos
   rechazados**: la causa de fondo del hallazgo anterior. Dejar "Correo"
   en blanco en el alta de un cliente enviaba `email: ''`, y
   `@IsOptional() @IsEmail()` de `class-validator` **no** trata `''` como
   "no informado" (solo `undefined`/`null`) — el backend rechazaba una
   alta perfectamente válida. Se agregó `omitEmptyStrings` (`lib/utils.ts`)
   y se aplicó en `CustomerSheet`, `SupplierSheet` y, por el mismo motivo,
   en `CompanyForm` (mismo patrón desde F1, nunca disparado hasta ahora).
3. **Mejora de navegación encontrada durante la verificación manual**: el
   resaltado de ítem activo del `SidebarNav` comparaba la ruta con
   igualdad estricta; entrar al detalle de un cliente/proveedor
   (`/clientes/[id]`) apagaba el resaltado de "Clientes". Corregido para
   comparar también por prefijo, igual que ya hacía "Configuración" desde
   F1 — no se había notado porque F1 no tenía rutas anidadas de detalle.

### Explícitamente no cubierto

Igual que lo ya documentado en §7: el caso E2E de Comprobantes (depende
de F5), links directos a Voucher/Payment desde la cuenta corriente
(dependen de F5/F6), validación de CBU, documentos adjuntos.
