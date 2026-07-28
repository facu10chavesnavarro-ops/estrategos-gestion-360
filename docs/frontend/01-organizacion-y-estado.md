# Frontend — Organización de módulos, componentes, rutas y estado global

> Depende de las decisiones aprobadas en `00-arquitectura-frontend.md`.
> Los nombres de carpeta siguen 1:1 los módulos del backend
> (`apps/api/src/modules/*`) para que cualquiera que conozca uno conozca
> el otro sin traducir mentalmente.

## 1. Mapa de rutas completo

Todo bajo `(authenticated)/[companyId]/`, salvo lo marcado `(public)`.

```
(public)/
  login/
  invitaciones/[token]/            # aceptar invitación (RN de Sprint 1)

(authenticated)/
  seleccionar-empresa/             # si el usuario tiene >1 empresa

  [companyId]/
    inicio/                        # dashboard: accesos rápidos, resumen de caja/saldos

    configuracion/
      empresa/                     # datos de la empresa, sucursales
      usuarios/                    # miembros, roles, invitaciones
      contabilidad/                # activar Contabilidad, Plan de Cuentas, mapeo

    clientes/
      page.tsx                     # listado + búsqueda + import CSV
      nuevo/
      [customerId]/
        page.tsx                   # detalle + cuenta corriente

    proveedores/                   # mismo patrón que clientes
      ...

    catalogo/
      categorias/
      items/
      impuestos/
      listas-de-precio/
        [priceListId]/

    stock/
      depositos/
      movimientos/                 # listado global de StockMovement con filtros
      transferencias/nueva/
      ajustes/nuevo/

    comprobantes/
      page.tsx                     # listado con filtros (contraparte, tipo, fecha)
      nuevo/                       # alta de Factura/NC — el flujo más complejo, ver doc 02 §3
      [voucherId]/                 # detalle, inmutable

    tesoreria/
      cobros-y-pagos/
        page.tsx
        nuevo/
      cuentas-corrientes/
        clientes/[customerId]/
        proveedores/[supplierId]/

    caja-bancos/
      cajas/
        [cashRegisterId]/
          page.tsx                 # estado, abrir sesión
      sesiones/[cashSessionId]/    # movimientos, cerrar sesión
      bancos/
        [bankAccountId]/           # movimientos, alta de movimiento manual

    contabilidad/
      plan-de-cuentas/
        [accountId]/               # detalle + Libro Mayor
      libro-diario/
      asientos/nuevo/              # asiento manual
```

Puntos de venta (`PointOfSale`) y depósitos (`Warehouse`) no tienen ruta
propia de primer nivel: son configuración de una sucursal, se administran
desde `configuracion/empresa/[branchId]` (tabs), no desde el menú
principal — no son algo que un usuario de operación visite seguido.

## 2. Organización de componentes

```
components/
  ui/                     # shadcn/ui: Button, Input, Dialog, Combobox, Table, Toast...
  layout/
    AppShell.tsx          # sidebar + topbar + <main>, envuelve todo (authenticated)/[companyId]
    Sidebar.tsx
    CompanySwitcher.tsx   # selector de empresa en el topbar
    Breadcrumbs.tsx
  shared/                 # genérico entre módulos, no de un dominio específico
    DataTable.tsx          # wrapper de TanStack Table con paginación/orden estándar
    ConfirmDialog.tsx      # confirmación para acciones irreversibles (activar/desactivar, etc.)
    MoneyInput.tsx         # input numérico con formato de moneda (usa decimal.js, no float)
    EntityCombobox.tsx     # combobox genérico "buscar y elegir" (cliente, ítem, cuenta contable...)
    StatusBadge.tsx        # activo/inactivo, abierta/cerrada, etc.
  customers/               # un folder por módulo del backend
    CustomerForm.tsx
    CustomerTable.tsx
    CustomerCurrentAccountPanel.tsx
  suppliers/
  catalog/
    CategoryTree.tsx
    ItemForm.tsx
    TaxForm.tsx
    PriceListItemsTable.tsx
  inventory/
    StockTable.tsx
    StockMovementForm.tsx
    StockTransferForm.tsx
  vouchers/
    VoucherForm.tsx         # el más complejo: cabecera + líneas dinámicas + totales en vivo
    VoucherLineRow.tsx
    VoucherDetail.tsx
  treasury/
    PaymentForm.tsx         # medios de pago múltiples, detalle condicional por medio
    CurrentAccountLedger.tsx
    CashSessionPanel.tsx
    BankAccountMovementsTable.tsx
  accounting/
    ChartOfAccountsTree.tsx
    JournalEntryForm.tsx
    JournalEntryLinesTable.tsx
    AccountLedgerTable.tsx
```

**Regla de ubicación:** un componente vive en `components/<módulo>/` si
conoce conceptos de ese módulo (nombres de campos, reglas de negocio). Si
es genérico (no le importa si la entidad es un Cliente o un Proveedor),
vive en `components/shared/`. Esta es la misma disciplina que
`common/` vs `modules/<x>/` en el backend.

## 3. Capa de datos (`lib/api/`)

Un archivo por módulo del backend, cada uno exportando hooks de TanStack
Query ya tipados con `packages/shared-types`:

```
lib/api/
  http-client.ts          # fetch wrapper: agrega companyId de la URL, maneja ApiError
  query-keys.ts           # fábrica centralizada de keys de caché (evita strings sueltos)
  customers.ts            # useCustomers(), useCustomer(id), useCreateCustomer(), ...
  suppliers.ts
  catalog.ts               # categorías, ítems, impuestos, listas de precio
  inventory.ts
  vouchers.ts
  treasury.ts
  accounting.ts
  auth.ts                  # login, logout, sesión actual (no pasa por TanStack Query)
```

Convención de nombres de hook (idéntica en los ~9 módulos, así que se
aprende una vez): `use<Entidades>()` para listados, `use<Entidad>(id)`
para detalle, `useCreate<Entidad>()` / `useUpdate<Entidad>()` /
`useDeactivate<Entidad>()` / `useActivate<Entidad>()` para mutaciones —
mismo verbo que el caso de uso del backend que llaman, para que el nombre
del hook delate directamente qué endpoint golpea.

## 4. Arquitectura de estado — qué vive dónde

Esta es la pregunta que más ambigüedad genera en un frontend sin
disciplina, así que se fija una regla estricta por tipo de dato:

| Tipo de dato | Dónde vive | Ejemplo |
|---|---|---|
| Datos que existen en el backend | TanStack Query | listado de clientes, saldo de cuenta corriente, Libro Mayor |
| Identidad de empresa/sucursal activa | URL (`[companyId]` del path) | nunca en Zustand ni Context — ver `00-arquitectura-frontend.md` §2.4 |
| Filtros de una lista (búsqueda, rango de fechas, página) | URL (query string) | `?search=&from=&to=&page=` — permite compartir el enlace de "la lista filtrada así" |
| Estado de un formulario en progreso | React Hook Form (local al componente) | cabecera + líneas de un Comprobante mientras se completa |
| Sesión del usuario (nombre, email, empresas autorizadas) | Zustand (`useSessionStore`) | se lee del BFF una vez tras login, no se vuelve a pedir en cada navegación |
| Preferencias de UI que sobreviven a la navegación | Zustand (`useUiStore`) | sidebar colapsado, columnas visibles de una tabla |
| Estado efímero de un componente (¿está abierto este diálogo?) | `useState` local | confirmación de "desactivar cliente" |

**Por qué la URL para filtros de lista:** además de compartibilidad,
evita el bug clásico de "aprieto Atrás y la lista volvió a un estado que
no es el que tenía" — con la URL como fuente de verdad, el botón Atrás
del navegador funciona gratis.

## 5. Cliente HTTP y manejo de errores

`lib/api/http-client.ts` es la única pieza que sabe hablar con
`/api/backend/*` (el BFF). Contrato:

```ts
class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {}
}

async function apiFetch<T>(path: string, companyId: string, init?: RequestInit): Promise<T>
```

Cada hook de `lib/api/<módulo>.ts` llama a `apiFetch` y traduce el error a
lo que la pantalla necesita mostrar — mismo patrón ya usado en
`api-client.ts` de Sprint 0, generalizado a los ~90 endpoints. Los
mensajes de error que devuelve el backend (`GlobalExceptionFilter`, ya en
español) se muestran tal cual en el `<Toast>`/mensaje de formulario, sin
reescribirlos — el backend es la fuente de verdad de qué salió mal.

## 6. Convención de tests

- **Unitarios de componentes** (Vitest + Testing Library): un componente
  con lógica propia relevante (ej. `VoucherLineRow` calculando el
  subtotal en vivo) se prueba en aislamiento, mockeando los hooks de
  `lib/api/`.
- **End-to-end** (Playwright): un flujo por módulo que ejercite la
  pantalla contra la API real (mismo espíritu que los tests de
  integración del backend) — ej. "crear un cliente y verlo en el
  listado", "confirmar una Factura y ver el saldo de cuenta corriente
  subir". Se documentan en el plan de sprints (`03-plan-de-
  implementacion.md`) junto con cada módulo, no como una fase aparte al
  final.
