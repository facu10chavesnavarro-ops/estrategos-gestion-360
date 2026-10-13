# Estrategos Gestión 360 — Resumen del proyecto y de la base de datos

Documento para compartir con quien se sume al proyecto o necesite entender
su estado. Fecha: 13 de octubre de 2026.

---

## 1. ¿Qué es?

Un sistema de gestión (ERP) web para empresas, con varias empresas por
cuenta. Cubre ventas, clientes y proveedores, stock, cobros y pagos, caja y
bancos, y contabilidad.

## 2. Qué funciona hoy

El desarrollo de los módulos planificados (F0 a F8) está terminado:

| Módulo | Qué permite |
|---|---|
| Acceso y usuarios | Login, selección de empresa, invitación de usuarios, roles |
| Clientes y proveedores | Alta, edición, baja e importación por CSV |
| Catálogo | Productos, servicios, categorías, impuestos, listas de precios |
| Stock | Depósitos, movimientos y transferencias |
| Comprobantes | Facturas y notas de crédito, numeración correlativa por punto de venta |
| Tesorería | Cobros y pagos con varios medios de pago, cuentas corrientes |
| Caja y bancos | Sesiones de caja, cuentas bancarias, transferencias |
| Contabilidad | Plan de cuentas, asientos automáticos y manuales, libro diario y mayor |

También se hizo una auditoría de seguridad y se cerraron todos los
hallazgos: acceso entre empresas, límite de intentos de login,
actualización de dependencias, protección CSRF y cierre real de sesión.

## 3. Tecnología

- **Backend:** NestJS (Node.js), PostgreSQL con Prisma.
- **Frontend:** Next.js 15 con React 19.
- **Entorno de prueba:** API en Render, frontend en Vercel, base en Neon.
- **Código:** GitHub, rama `master`.

## 4. Base de datos

Las migraciones están en `apps/api/prisma/migrations`. Son 16, aplicadas en
orden desde julio de 2026, y se corren con `prisma migrate deploy` (el
Dockerfile de la API lo hace solo al arrancar).

### Principios de diseño

1. **Varias empresas por cuenta.** Existe `tenants` → `companies`, y casi
   todas las tablas llevan `company_id`. Un usuario puede pertenecer a varias
   empresas, con un rol distinto en cada una (`company_users`).
2. **Validación en dos capas.** Las reglas de negocio se validan en el código
   y, además, la base rechaza valores inválidos con restricciones `CHECK`
   (montos negativos, cantidades en cero, tipo de cambio menor o igual a 0).
   Así un script o un módulo futuro con un error no puede dejar datos rotos.
3. **Unicidad por empresa.** Los índices únicos incluyen `company_id`:
   SKU, código de barras, CUIT/tax id y código de punto de venta se pueden
   repetir entre empresas, pero no dentro de una.
4. **Numeración fiscal sin huecos.** `voucher_counters` guarda el último
   número por empresa, punto de venta y tipo de comprobante, y `vouchers`
   impide repetir esa combinación.
5. **Baja lógica.** Las entidades se desactivan con `is_active` en lugar de
   borrarse. Hay índices `(company_id, is_active)` para listar activos rápido.

### Qué agrega cada migración

| # | Migración | Contenido |
|---|---|---|
| 1 | `init` | `tenants`, `companies`, `users`, `roles`, `company_users`, `refresh_tokens`, `audit_logs` |
| 2 | `company_fields_branches_auditlog_index` | Sucursales (`branches`) y campos extra de empresa |
| 3 | `invitations_and_company_user_active` | Invitaciones y estado activo por miembro |
| 4 | `parties_customers_suppliers` | `parties` (persona o razón social) y de ahí `customers` y `suppliers` |
| 5 | `composite_active_indexes` | Índices `(company_id, is_active)` para rendimiento |
| 6 | `credit_limit_check_constraint` | El límite de crédito de un cliente no puede ser negativo |
| 7 | `catalog_master_data` | Categorías, ítems (producto o servicio), impuestos, listas de precio |
| 8 | `warehouses_stock_movements` | Depósitos, stock y movimientos de stock |
| 9 | `vouchers` | Puntos de venta, tipos de comprobante, contadores, comprobantes, líneas e impuestos por línea |
| 10 | `treasury` | Medios de pago, cobros y pagos, aplicaciones a comprobantes, cuentas corrientes de clientes y proveedores, detalle de cheques y tarjetas |
| 11 | `caja_bancos` | Cajas, sesiones de caja, movimientos de caja, cuentas bancarias y sus movimientos |
| 12 | `contabilidad` | Plan de cuentas, configuración contable, asientos y líneas de asiento |
| 13 | `company_payment_method_account_direction` | Agrega `direction` (cobro o pago) a la clave primaria de las cuentas contables por medio de pago |
| 14 | `add_item_barcode_cost_long_description` | Código de barras (único por empresa), costo y descripción larga en ítems |
| 15 | `add_payment_idempotency_key` | Clave de idempotencia en `payments`, única por empresa: evita cobros duplicados por doble clic |
| 16 | `add_user_tokens_invalidated_at` | Marca por usuario para revocar los access tokens al cerrar sesión |

### Grupos de tablas

- **Identidad y acceso:** tenants, companies, branches, users, roles,
  company_users, invitations, refresh_tokens, audit_logs.
- **Terceros:** parties → customers y suppliers.
- **Catálogo y stock:** categories, items, taxes, price_lists, warehouses,
  stock, stock_movements.
- **Comprobantes:** points_of_sale, voucher_types, voucher_counters, vouchers,
  voucher_lines, voucher_line_taxes.
- **Tesorería:** payment_methods, payments, payment_allocations, cuentas
  corrientes de clientes y proveedores con sus movimientos.
- **Caja y bancos:** cash_registers, cash_sessions, bank_accounts y sus
  movimientos.
- **Contabilidad:** chart_of_accounts, accounting_settings, journal_entries y
  journal_entry_lines.

### Detalles a tener en cuenta

- `vouchers.cae` y `vouchers.cae_expiration_date` existen pero quedan siempre
  vacíos: la integración con ARCA/AFIP está fuera del alcance actual.
- La tabla `stock` no impone cantidad mayor o igual a 0 a propósito: permitir
  stock negativo es una decisión por empresa, no una regla global.
- La migración 13 cambia una clave primaria y agrega una columna sin valor por
  defecto. Falla si la tabla ya tiene filas. Funcionó porque se aplicó con la
  tabla vacía.
- Hay dos seeds, fuera de las migraciones:
  - `prisma/seed.ts`: roles, catálogos globales, tenant, Empresa Piloto y un
    usuario administrador. Se puede correr en cualquier entorno.
  - `prisma/seed-demo.ts`: datos de demostración (clientes, ítems,
    comprobantes). No debe correrse en producción real.
- Las migraciones son SQL generado por Prisma a partir de `schema.prisma`.
  Para cambiar el modelo se edita el schema y se genera una migración nueva;
  las ya aplicadas no se editan.

## 5. Estado actual

- ✅ Sistema completo y probado en el entorno de desarrollo.
- 🔴 **El entorno de prueba online está caído.** La base gratuita de Render
  venció el 2 de octubre de 2026. Ya existe una base nueva en Neon con las
  migraciones y los datos de demostración. Falta redeployar el servicio de la
  API para que vuelva a funcionar.
- 🔴 **Todavía no sirve para facturar legalmente.** Los comprobantes son
  registros internos sin la autorización electrónica de ARCA/AFIP (CAE).

## 6. Lo que falta para uso real

1. **Facturación electrónica ARCA/AFIP.** Es lo más importante. Requiere el
   certificado digital de la empresa, que tramita el titular o su contador en
   el sitio de AFIP.
2. PDF e impresión del comprobante.
3. Envío del comprobante por email al cliente.
4. Reportes de ventas.
5. Presupuestos y remitos (quedaron fuera del alcance original).

## 7. Próximos pasos

1. Dejar el entorno de prueba funcionando de nuevo (un redeploy en Render).
2. Que el contador pruebe con la lista de 57 casos de prueba
   (`docs/uat-checklist.md`).
3. Empezar la integración con ARCA/AFIP en el ambiente de pruebas de AFIP.
4. Sumar PDF, email y reportes.
