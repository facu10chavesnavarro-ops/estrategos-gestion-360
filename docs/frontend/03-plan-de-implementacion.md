# Frontend — Plan de implementación por sprints

> Depende de `00-arquitectura-frontend.md`, `01-organizacion-y-estado.md`
> y `02-navegacion-y-ux.md`. Numeración `F0, F1, ...` para no confundirla
> con los Sprints 0-4 del backend, aunque F1 en adelante mapea 1:1 con un
> módulo de backend ya construido — no hay descubrimiento de reglas de
> negocio pendiente, es implementación de UI sobre un contrato ya estable
> y documentado (`/api/docs`).

Mismo criterio de "Sprint terminado" que el backend
(`docs/ARQUITECTURA.md` §7), adaptado: documentar antes de programar
cuando aparece una decisión de UX no cubierta por `02-navegacion-y-ux.md`,
tests (componentes + e2e) antes de dar el sprint por cerrado, `tsc`/
`eslint`/build sin errores, versionar (`apps/web` sube su propio
`package.json` a partir de F0).

## F0 — Fundación (sin pantallas de negocio todavía)

- Instalar y configurar Tailwind CSS + shadcn/ui, reskineado con la
  paleta existente (`--ink`, `--paper`, `--ledger-green`, etc.).
- `packages/shared-types`: script de generación desde `/api/docs-json`
  (`openapi-typescript`), corrido en `predev`/`prebuild`.
- TanStack Query: `QueryClientProvider` en el layout raíz, `lib/api/http-
  client.ts`, `lib/api/query-keys.ts`.
- BFF: Route Handlers reales reemplazando el rewrite actual de
  `next.config.js`, con cookies `httpOnly` para access/refresh token y
  rotación transparente (`00-arquitectura-frontend.md` §2.3).
- Zustand: `useSessionStore`, `useUiStore` vacíos con su forma definida.
- Flujo de auth completo: login (persistiendo sesión de verdad, no el
  `console.log` de Sprint 0), logout, expiración/renovación de sesión,
  selector de empresa (`seleccionar-empresa/`), redirección a
  `/[companyId]/inicio`.
- `AppShell` (sidebar + topbar + `CompanySwitcher`), sin ítems de menú
  todavía apuntando a nada (o apuntando a "Próximamente").
- **Entregable**: un usuario puede loguearse, elegir empresa, ver el
  shell vacío, cerrar sesión. E2E: login exitoso, login fallido, logout,
  sesión expirada redirige a login.

## F1 — Configuración: Empresa, Sucursales, Usuarios

Cubre los módulos `companies` y `users` del backend.

- `configuracion/empresa/`: datos de la empresa (editar), listado de
  sucursales (alta/edición/activar-desactivar).
- `configuracion/usuarios/`: miembros de la empresa (listar, cambiar rol,
  activar/desactivar), invitaciones (crear, listar, revocar), pantalla
  pública de aceptar invitación (`(public)/invitaciones/[token]/`).
- **Entregable**: administrar la empresa y su equipo de punta a punta.
  E2E: invitar a un usuario, aceptar la invitación, verlo listado como
  miembro activo.

## F2 — Clientes y Proveedores

Cubre `customers` y `suppliers` (estructura idéntica entre ambos, se
construyen juntos).

- Listado con búsqueda/filtro por estado, alta/edición (panel lateral),
  activar/desactivar, importación por CSV (con feedback de qué filas se
  crearon/omitieron — el backend ya distingue modos de importación).
- Detalle con la cuenta corriente embebida (aunque el endpoint de cuenta
  corriente es de `treasury`, mostrarla en el detalle del cliente es más
  intuitivo que mandar a un módulo separado — decisión de UX, no de
  arquitectura de datos).
- **Entregable**: alta, edición, baja e importación de clientes y
  proveedores. E2E: crear un cliente, importar un CSV de proveedores,
  desactivar uno y verificar que desaparece del selector de contraparte
  en Comprobantes (F5) — este último caso se agrega como test cuando F5
  exista.

## F3 — Catálogo

Cubre `catalog`: categorías, ítems, impuestos, listas de precio.

- Categorías: árbol jerárquico (`CategoryTree`), con el mapeo contable
  opcional (cuentas de venta/compra) visible pero no obligatorio hasta
  que se use en F8.
- Ítems: alta/edición con tipo (Producto/Servicio), impuestos asociados
  (multi-select), `tracksStock` condicional a Producto.
- Impuestos: alta (tasa y vigencia inmutables, la UI lo comunica), cierre
  de vigencia, mapeo contable opcional.
- Listas de precio: alta, y gestión de precios por ítem dentro de una
  lista (tabla editable inline).
- **Entregable**: catálogo completo administrable. E2E: crear categoría →
  ítem con esa categoría e impuesto → agregarlo a una lista de precios.

## F4 — Stock

Cubre `inventory`: depósitos, stock, movimientos, transferencias, ajustes.

- Depósitos: alta/edición dentro de una sucursal (en
  `configuracion/empresa/[branchId]`, ver doc 02 §1).
- Consulta de stock por depósito/ítem, historial de movimientos con
  filtros (tipo, ítem, rango de fechas).
- Ajuste manual y transferencia entre depósitos, con confirmación
  explícita del efecto (sube/baja cuánto, en qué depósito).
- **Entregable**: visibilidad y control manual de stock. E2E: ajuste
  positivo de un ítem, transferencia entre dos depósitos, verificar
  ambos saldos.

## F5 — Comprobantes

El sprint de mayor complejidad de UI (doc 02 §3.1). Cubre `vouchers`.

- Puntos de venta: alta/edición (en `configuracion/empresa/[branchId]`).
- Listado de comprobantes con filtros.
- Alta de Factura/Nota de Crédito: el flujo completo de doc 02 §3.1,
  incluyendo el cálculo en vivo de subtotal/impuestos/total y la
  selección condicional de depósito.
- Detalle de comprobante (inmutable, con sus líneas y el efecto de stock/
  cuenta corriente que generó, si Contabilidad está activa también el
  asiento asociado — enlace directo a `contabilidad/asientos` cuando F8
  exista).
- **Entregable**: emitir Facturas A/B/C y Notas de Crédito de punta a
  punta. E2E: Factura de Venta con stock → verifica que el stock bajó;
  Nota de Crédito asociada → verifica que el stock y la cuenta corriente
  se revirtieron.

## F6 — Tesorería

Cubre `treasury` (sin Caja/Bancos, que es F7): medios de pago, pagos,
cuentas corrientes.

- Registro de Cobro/Pago: el flujo completo de doc 02 §3.2.
- Cuentas corrientes de cliente/proveedor: saldo actual + historial de
  movimientos (ya embebido parcialmente en F2, acá se completa con el
  detalle de cada movimiento y su comprobante/pago de origen).
- **Entregable**: cobrar/pagar imputando a comprobantes. E2E: Factura →
  Cobro parcial → verificar saldo pendiente; Cobro total → verificar
  saldo en cero.

## F7 — Caja y Bancos

Cubre el resto de `treasury`: cajas, sesiones, cuentas bancarias.

- Cajas: alta, apertura de sesión (bloquea si ya hay una abierta,
  reflejando RN-CASH-02 con un mensaje claro, no un error genérico).
- Sesión de caja: el flujo de doc 02 §3.3 completo (movimientos
  manuales, cierre con saldo esperado/diferencia).
- Cuentas bancarias: alta, movimientos (listado + alta manual).
- **Entregable**: control de caja y bancos de punta a punta, incluyendo
  que un Cobro en efectivo de F6 quede reflejado en la sesión de caja
  correspondiente. E2E: abrir sesión → Cobro en efectivo (via F6) →
  movimiento manual → cerrar sesión → verificar diferencia en cero.

## F8 — Contabilidad

Cubre `accounting`: el módulo más nuevo del backend, opt-in por empresa.

- Wizard de activación + mapeo (doc 02 §3.4).
- Plan de Cuentas: árbol, alta/edición/activar/desactivar cuenta.
- Libro Diario (listado de asientos, filtro por fecha) y Libro Mayor por
  cuenta (con saldo acumulado, tabla).
- Asiento manual: alta con líneas Debe/Haber, validación de balanceo en
  vivo (mismo criterio que Comprobantes: se calcula en el cliente para
  UX, el backend es quien decide de verdad).
- Reversión de asiento, con el vínculo visual claro entre original y
  reversión.
- **Entregable**: Contabilidad operable de punta a punta, incluyendo ver
  el asiento automático que generó una Factura de F5 o un Cobro de F6.
  E2E: activar Contabilidad → mapear cuentas mínimas → Factura → ver su
  asiento → Cobro → ver su asiento → Libro Mayor de Caja refleja ambos.

## F9 — Pulido transversal (post-MVP de frontend, no bloqueante)

No es un módulo de backend nuevo, es endurecimiento de lo ya construido:
buscador global (`Cmd/Ctrl+K`, doc 02 §5), dashboard de `inicio` con
accesos y resúmenes reales (hoy es un placeholder desde F0), estados de
carga/error revisados con datos reales de producción, auditoría de
accesibilidad con lector de pantalla. Se prioriza después de tener los 8
módulos funcionalmente completos, no antes — "funciona de punta a punta"
vale más que "el primer módulo está pulido" para llegar a un frontend
usable cuanto antes.
