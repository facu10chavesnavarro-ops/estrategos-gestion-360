# Sprint 2 — Terceros

Objetivo (según `docs/SPRINT-0.md` / documento fuente): Clientes, proveedores,
importación CSV, fichas y documentación.

Estado: **cerrado.** El único módulo de su alcance construible en este
momento (Clientes y Proveedores) está implementado, probado y versionado
(`v0.3.0`). Los dos ítems restantes del alcance general (cuenta corriente y
documentos) quedan diferidos por decisión explícita — ver §5.

## 1. Resumen funcional

Sprint 2 agrega la gestión de "Terceros": personas físicas o jurídicas con
las que una empresa opera como cliente, proveedor, o ambos a la vez. El
punto central de diseño fue modelar la identidad compartida (razón social,
CUIT, contacto) una sola vez, sin importar cuántos roles de negocio tenga esa
persona, y separar en dos módulos de dominio independientes lo que sí es
específico de cada rol (límite de crédito y condición de venta para
Clientes; datos bancarios y condición de compra para Proveedores).

Además, se construyó — a pedido explícito del usuario — un motor de
importación CSV genérico y reutilizable, para que Clientes y Proveedores no
dupliquen la lógica de parseo/validación/deduplicación/auditoría/reporte, y
para que módulos futuros (Productos, Servicios, Plan de cuentas, Bancos,
Stock) puedan reutilizarla sin reescribirla.

## 2. Metodología seguida

Mismo proceso que Sprint 1, con dos ajustes pedidos por el usuario para este
sprint:

1. Documentación completa antes de código (modelo de datos, reglas de
   negocio, endpoints, casos de uso, plan de pruebas).
2. **Detección explícita de decisiones de arquitectura/escalabilidad no
   resueltas, con parada obligatoria**: dos veces en este sprint se
   encontró una decisión de este tipo, se presentaron alternativas con
   ventajas/riesgos, se recomendó una, y se esperó aprobación antes de
   tocar el esquema o el alcance (ver §5).
3. Implementación siguiendo Clean Architecture, reutilizando el núcleo
   compartido de `common/` ya establecido en Sprint 1 (autorización por rol,
   auditoría) y extendiéndolo con un nuevo componente reutilizable (el motor
   de importación).
4. Verificación real: `tsc --noEmit`, `lint`, tests unitarios, y
   verificación end-to-end manual con `curl` contra Postgres real.
5. Al aprobarse: commit, `CHANGELOG.md`, tag de versión.

Documento de diseño del módulo (fuente de verdad detallada):
[`docs/sprint-2/01-clientes-proveedores.md`](sprint-2/01-clientes-proveedores.md).

## 3. Modelo de datos

- **`Party`** (Tercero, nuevo): razón social, CUIT, condición fiscal, email,
  teléfono, domicilio, contacto y notas — una sola vez por persona/empresa,
  sin importar cuántos roles tenga. `@@unique([companyId, taxId])` reforzada
  en la base de datos (no solo en el código).
- **`Customer`** (Cliente, nuevo): referencia a `Party` (`partyId`, relación
  1 a 0/1), más `paymentTermDays` (condición de venta), `creditLimit`
  (primer campo `Decimal` real del sistema) e `isActive` propio.
- **`Supplier`** (Proveedor, nuevo): referencia a `Party`, más
  `paymentTermDays` (condición de compra — mismo nombre, significado
  inverso a `Customer`), `bankName`, `bankAccountHolder`, `bankCbu` e
  `isActive` propio.
- `companyId` deliberadamente duplicado en `Customer` y `Supplier` además de
  en `Party` — ver decisión de escalabilidad en §5.

## 4. Reglas de negocio implementadas

RN-TER-01 a RN-TER-14 (detalle completo en el documento de diseño del
módulo). Los puntos más relevantes:

- Ni clientes ni proveedores se eliminan físicamente; se desactivan por rol
  de forma independiente (desactivar como Cliente no afecta el rol de
  Proveedor de la misma persona, y viceversa).
- No puede haber dos `Party` con el mismo CUIT en la misma empresa
  (restricción de base de datos).
- Al dar de alta un Cliente/Proveedor con un CUIT que ya pertenece a un
  `Party` existente: si ese `Party` ya tiene ese rol, es un duplicado
  (rechazado); si no lo tiene, se le agrega el rol reutilizando sus datos
  ya guardados, sin pisarlos con el formulario de alta.
- Editar un Cliente/Proveedor permite modificar en una sola operación tanto
  los datos compartidos del `Party` como los específicos del rol.
- Toda alta, edición y cambio de estado se audita; la importación CSV
  audita cada fila creada/actualizada más un resumen de la operación
  completa, con los mismos nombres de acción que las altas/ediciones
  manuales (ver bug corregido en §7).
- Importación CSV: tres modos configurables (solo agregar nuevos —
  default—, actualizar existentes, omitir duplicados silenciosamente),
  procesamiento best-effort por fila, nunca crea un CUIT duplicado sin
  importar el modo.

## 5. Decisiones de arquitectura/escalabilidad detectadas y resueltas con el usuario

Dos decisiones reales se detectaron durante el diseño de este sprint, en
ambos casos se detuvo la implementación, se presentaron alternativas, y se
esperó aprobación antes de continuar:

1. **Modelo unificado de Personas vs. entidades separadas**: a pedido
   explícito del usuario, se introdujo `Party` como entidad base compartida
   entre `Customer` y `Supplier`, en vez de duplicar datos fiscales/
   legales/de contacto en cada uno. Documentado en
   `docs/sprint-2/01-clientes-proveedores.md` §0.4.
2. **Dónde vive `companyId`** (normalizado solo en `Party` vs. duplicado
   también en `Customer`/`Supplier`): se detectó que un modelo
   completamente normalizado rompería el patrón de columna `companyId`
   directa e indexada que usa todo el sistema desde Sprint 0, complicando
   el Row Level Security todavía pendiente. **Resuelto**: `companyId`
   duplicado en las tres tablas — redundante pero seguro (nunca se edita
   independientemente). Documentado en
   `docs/sprint-2/01-clientes-proveedores.md` §0.5.
3. **Alcance de "cuenta corriente" y "documentos" de Sprint 2** (esta
   sesión, antes de programar un supuesto "Módulo 2"): se confirmó con el
   usuario que ambos quedan diferidos — ver §8.

## 6. Endpoints implementados

14 endpoints nuevos, simétricos entre Clientes y Proveedores — listado
completo en `docs/sprint-2/01-clientes-proveedores.md` §3:

- `GET/POST /companies/:id/customers`, `GET/PATCH /companies/:id/customers/:customerId`,
  `POST .../customers/:customerId/(de)activate`, `POST .../customers/import`.
- Mismos siete endpoints para `/companies/:id/suppliers`.

## 7. Archivos creados o modificados

- `apps/api/package.json` — dependencia nueva `csv-parse`.
- `apps/api/prisma/schema.prisma` — modelos `Party`, `Customer`, `Supplier`.
- `apps/api/src/common/domain/rules/tax-id.validator.ts` — reubicado desde
  `modules/companies` (tercera entidad que lo necesita).
- `apps/api/src/common/domain/import/**`, `common/application/csv-import.engine.ts`,
  `common/infrastructure/csv-parse-adapter.ts`, `common/presentation/dto/import-request.dto.ts`
  — motor de importación reutilizable, nuevo.
- `apps/api/src/modules/parties/**` — módulo nuevo (solo domain +
  infrastructure, sin endpoints propios).
- `apps/api/src/modules/customers/**`, `apps/api/src/modules/suppliers/**`
  — módulos nuevos completos.
- `apps/api/test/common/import/**`, `apps/api/test/customers/**`,
  `apps/api/test/suppliers/**` — specs nuevas.

## 8. Migraciones aplicadas

| Migración | Contenido |
|---|---|
| `parties_customers_suppliers` | Modelos `Party`, `Customer`, `Supplier`, con `@@unique([companyId, taxId])` en `Party` y `companyId` indexado en las tres tablas. |

## 9. Pruebas — cantidad y resultado

- **93/93 tests unitarios pasan** (5 del motor de importación genérico + 13
  de Clientes + 11 de Proveedores + los 64 heredados de Sprints 0/1).
- `npx tsc --noEmit`: 0 errores. `npm run lint`: 0 errores.
- Verificación end-to-end manual con `curl` contra Postgres real: alta,
  edición combinada Party+rol, duplicado rechazado, desactivación por rol
  independiente, importación CSV en los 3 modos (incluyendo detección de
  duplicado dentro del mismo archivo), auditoría por fila y resumen,
  filtros de listado, aislamiento multiempresa. Detalle completo en
  `docs/sprint-2/01-clientes-proveedores.md` §8.
- No se armaron pruebas de integración automatizadas contra una base de
  test real — mismo criterio que sprints anteriores, sin infraestructura
  para eso todavía; la verificación end-to-end fue manual.

## 10. Bugs encontrados y corregidos

1. **Nombres de acción de auditoría inconsistentes**: la importación CSV
   registraba `customer.created`/`customer.updated` (participio) mientras
   que las altas/ediciones manuales usan `customer.create`/`customer.update`
   (presente) — mismo problema espejado en `supplier.*`. Alguien filtrando
   auditoría por `action='customer.create'` se habría perdido las altas
   hechas por CSV. Corregido para que ambas vías usen los mismos nombres.
2. **Falso negativo durante la verificación, no reproducido**: un primer
   intento de importar un CSV a los 4 segundos de reiniciar el servidor no
   persistió nada; un reintento inmediato funcionó. Consistente con una
   ventana de arranque de Nest/Prisma, no con un defecto de código — no se
   encontró causa en el código y no volvió a ocurrir. Anotado por
   transparencia, sin inventar una causa que no se pudo confirmar.

## 11. Riesgos y deuda técnica pendiente

- **Cuenta corriente/saldo de Terceros**: diferido — RN-007 exige que el
  saldo se calcule a partir de operaciones confirmadas, y hoy no existe
  ninguna Venta, Cobro, Compra ni Pago (Sprint 3 y 4 respectivamente). No es
  deuda técnica en el sentido de "algo mal hecho": es una secuencia de
  construcción correcta — construirlo antes tiempo hubiera significado un
  campo `saldo` que siempre vale cero.
- **Documentos adjuntos reales para Terceros**: diferido — el módulo
  completo de gestión documental (M10: categorías, vencimientos,
  versionado) es Sprint 6. Hoy solo existe el campo `notes` (texto libre)
  en `Party`.
- **Row Level Security de Postgres**: sigue pendiente desde Sprint 0/1 — el
  aislamiento multiempresa de `Party`/`Customer`/`Supplier` depende hoy
  exclusivamente de `CompanyContextGuard` + el filtro `companyId` en cada
  repositorio, no de una política de base de datos.
- **Validación de CBU**: `bankCbu` se guarda como texto libre, sin validar
  dígito verificador — no hay requisito explícito del documento fuente que
  lo pida.
- **Rendimiento de la importación CSV con archivos grandes**: no evaluado —
  no hay datos de un piloto real que indiquen si hace falta procesamiento
  asíncrono (colas) en vez de una request síncrona. Documentado como mejora
  futura, no como bloqueante del MVP.

## 12. Versionado

| Tag | Contenido |
|---|---|
| `v0.3.0` | Módulo 1 de Sprint 2 (Clientes y Proveedores, modelo unificado de Personas, motor de importación CSV reutilizable). |

Detalle completo en [`CHANGELOG.md`](../CHANGELOG.md).

## 13. Cierre

**Sprint 2 se da por cerrado.** Su alcance construible con lo que existe hoy
en el sistema (Clientes, Proveedores, importación CSV, fichas) está
documentado, implementado, probado (93/93) y versionado. Cuenta corriente y
documentos quedan explícitamente pendientes para cuando existan sus
prerrequisitos (Sprint 3/4 y Sprint 6 respectivamente) — decisión confirmada
con el usuario antes de cerrar, no una omisión.

Arranca Sprint 3 (Ventas y Cobranzas) según `docs/SPRINT-0.md` y la sección
"Alcance por etapas" del documento fuente, con la misma metodología:
documentación completa primero (modelo de datos, reglas de negocio,
endpoints, permisos, auditoría, decisiones de arquitectura/escalabilidad
detectadas y resueltas), luego implementación, migración, pruebas
unitarias/integración/e2e, lint/TypeScript, CHANGELOG y versión.
