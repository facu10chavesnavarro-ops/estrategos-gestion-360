# Núcleo Financiero — Propuesta de Arquitectura de Dominio (pre-Sprint 3)

Estado: **propuesta en revisión. No implementado. No se escribió código ni
migraciones para este documento.** Cubre el diseño de dominio para
Productos, Servicios, Categorías, Impuestos, Lista de precios, Stock,
Movimientos de stock, Ventas, Compras, Comprobantes, Detalle de
comprobantes, Caja, Bancos, Medios de pago, Cuentas corrientes, y el punto
de enganche hacia Asientos contables futuros.

Sigue el mismo método que Sprint 1/2: se documentan reglas de negocio y
modelo de datos, se presentan alternativas para cada decisión con impacto
arquitectónico, se recomienda una opción, y **se espera tu aprobación antes
de escribir una sola línea de código o de tocar `schema.prisma`.**

## 0. Restricciones heredadas (no negociables, ya fijadas en `ARQUITECTURA.md` §8)

Estas reglas se registraron durante Sprint 1 específicamente pensando en
este momento — se aplican a todo lo que sigue sin volver a discutirlas:

1. Todo monto es `Decimal`/`Numeric`, nunca `Float`.
2. Todo índice de reporte por período combina `companyId` + fecha en un
   único índice compuesto.
3. **Este es el punto donde se evalúa UUID v7** para las tablas de alto
   volumen (movimientos de stock, comprobantes, movimientos de caja/banco,
   cuenta corriente) — ver Decisión 1.1.
4. Antes de que una tabla de crecimiento ilimitado se acerque a decenas de
   millones de filas, evaluar particionado nativo de Postgres o archivado.
5. Ninguna consulta transaccional puede omitir `companyId`.
6. Ninguna optimización puede sacrificar trazabilidad (auditoría) ni
   aislamiento multiempresa.

A esto se suma lo ya vigente desde Sprint 0/1/2: Clean Architecture por
módulo, `domain/` sin imports de Nest/Prisma, soft-cancel (nunca `DELETE`
físico de algo confirmado), auditoría uniforme (RN-009), y el patrón
`Party` (Tercero) ya construido para Clientes/Proveedores — el núcleo
financiero **reutiliza `Party`**, no crea una nueva noción de "cliente"/
"proveedor".

---

## 1. Decisiones transversales

Estas nueve decisiones afectan a más de una de las 14 entidades pedidas —
se resuelven primero porque todo lo demás depende de ellas.

### 1.1 Identificadores de las tablas de alto volumen: UUID v4 vs UUID v7 vs `bigint` autoincremental

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — UUID v4 (el usado hoy en todo el sistema)** | Aleatorio, sin orden temporal. | Cero cambio de patrón; ya lo entiende todo el código existente. | A volúmenes de millones de filas (Comprobantes, MovimientoStock, MovimientoCuentaCorriente en 10 años de operación), la aleatoriedad degrada la localidad de los índices B-tree de Postgres — cada insert cae en una página al azar, no al final, lo que empeora el cache hit ratio y el tamaño del índice con el tiempo. |
| **B — UUID v7 (recomendada)** | Los primeros 48 bits son un timestamp; el resto es aleatorio. Se ve como UUID (compatible con Prisma `String @id`), pero ordena temporalmente. | Mantiene todas las ventajas de UUID (generable en el cliente, no filtra volumen de negocio como un autoincremental sí lo haría, sin coordinación central) mientras preserva localidad de inserción — el índice crece de forma similar a un autoincremental. Es exactamente la evaluación que `ARQUITECTURA.md` §8.3 pidió hacer "antes de crear la primera tabla de movimientos" — es ahora. | Prisma 5.20 no genera UUID v7 nativamente (`@default(uuid())` es v4) — requiere generarlo en la capa de aplicación (librería `uuidv7` o equivalente) en vez de dejar que la base de datos lo genere por default. Es una pieza de infraestructura nueva, pero pequeña y aislada (una función `generateId()` en `common/`). |
| **C — `bigint` autoincremental (`serial`/`identity`)** | Entero secuencial nativo de Postgres. | Máxima localidad de índice, el más liviano en espacio. | Filtra información de negocio (cantidad total de comprobantes emitidos, visible en la URL o en el número mismo) — inaceptable para una tabla como `Comprobante` cuyo id no debe confundirse con el número fiscal, pero sobre todo **rompe el patrón de todo el sistema**, que usa `String` UUID como PK en cada tabla existente; mezclar los dos tipos de PK en un mismo dominio es una inconsistencia que Sprint 1 ya decidió evitar. |

**Recomendación: B, UUID v7**, aplicado exclusivamente a las tablas nuevas
de alto volumen de este núcleo (`StockMovement`, `Voucher`, `VoucherLine`,
`CashMovement`, `BankMovement`, `CurrentAccountMovement`). Las tablas de
catálogo/maestro de bajo volumen (`Item`, `Category`, `Tax`, `PriceList`,
`PaymentMethod`, `Warehouse`, `CashRegister`, `BankAccount`) siguen con UUID
v4 — no hay beneficio de ordenar temporalmente un catálogo de cientos de
filas, y mantener el patrón actual ahí reduce la superficie de cambio.

### 1.2 Multi-moneda: ¿se diseña desde ahora o se difiere?

El MVP piloto opera en pesos argentinos. Pero un ERP pensado para 10+ años
en Argentina que nunca contempló una segunda moneda es, con altísima
probabilidad, un ERP que en algún momento necesita agregarla bajo presión
— y agregar moneda a un modelo de comprobantes/cuenta corriente ya en
producción es una migración de datos genuinamente riesgosa (cada monto
histórico necesita una moneda asignada retroactivamente).

**Recomendación**: diseñar el campo desde ahora, sin construir todavía
ninguna lógica de conversión real. Cada tabla que registra un monto
(`Voucher`, `VoucherLine`, `CashMovement`, `BankMovement`,
`CurrentAccountMovement`) lleva `currency` (default: la moneda de la
`Company`, ya existe ese campo) y `exchangeRate` (default `1` cuando
`currency` coincide con la de la empresa). El motor de conversión real
(tipo de cambio del día, oficial vs blue, actualización automática) queda
fuera de alcance de Sprint 3 — se construye cuando haya una necesidad real
de operar en una segunda moneda. Costo de diseñarlo ahora: dos columnas
adicionales por tabla. Costo de no diseñarlo ahora y necesitarlo después:
migración de datos sobre tablas ya en producción con montos históricos.

### 1.3 Numeración fiscal de Comprobantes (AFIP)

No es una alternativa de diseño, es un requisito legal: en Argentina, cada
comprobante fiscal (Factura, Nota de Crédito/Débito, Recibo) se numera de
forma **estrictamente secuencial y sin huecos** dentro de un **Punto de
Venta**, y la numeración de Factura Electrónica requiere un CAE (Código de
Autorización Electrónico) emitido por AFIP antes de poder considerarse
válida.

Esto tiene una consecuencia de diseño concreta: **la numeración no puede
ser un campo autoincremental de base de datos ni un UUID** — necesita un
contador propio por combinación `(companyId, puntoVentaId, voucherTypeId)`,
incrementado dentro de la misma transacción que crea el comprobante (la
infraestructura de Unit of Work recién construida es exactamente lo que
esto necesita: `unitOfWork.run()` alrededor de "leer el próximo número,
incrementarlo, crear el comprobante con ese número" garantiza que dos
comprobantes concurrentes del mismo punto de venta nunca puedan terminar
con el mismo número).

Modelo propuesto: `PointOfSale` (punto de venta — código AFIP, uno o más
por empresa/sucursal) + `VoucherCounter` (companyId, pointOfSaleId,
voucherTypeId, `lastNumber`) actualizado con bloqueo pesimista
(`SELECT ... FOR UPDATE`) dentro de la transacción de creación del
comprobante. La integración real con el webservice de AFIP (obtención de
CAE) queda **fuera de alcance de Sprint 3** — se diseña el campo
(`cae`, `caeExpirationDate`, nullable) para no tener que migrar la tabla
después, pero la integración se implementa en un sprint posterior
dedicado, con su propia decisión de arquitectura (biblioteca a usar,
certificado, ambiente de homologación vs producción).

### 1.4 La decisión central: ¿Comprobante único para Ventas y Compras, o jerarquías separadas?

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Jerarquías separadas** (`SalesInvoice`/`SalesInvoiceLine` por un lado, `PurchaseInvoice`/`PurchaseInvoiceLine` por otro) | Cada flujo de negocio tiene su propia tabla y su propio caso de uso, sin compartir código de numeración/impuestos/líneas. | Conceptualmente simple de leer al principio; ningún riesgo de que una regla de Compras se filtre a Ventas por accidente. | Duplica la lógica de numeración fiscal, cálculo de impuestos, snapshot de precios, efectos sobre stock y cuenta corriente — **dos veces** cada una. Cualquier corrección o mejora futura (ej. un nuevo tipo de impuesto, un cambio en el motor de numeración) se aplica dos veces, con el riesgo real de que una quede desactualizada respecto de la otra. No escala bien a los módulos futuros (Tesorería necesita leer comprobantes de ambos flujos de manera uniforme para conciliar cobros/pagos). |
| **B — Comprobante único, polimórfico por tipo (recomendada)** | Una única entidad `Voucher` (Comprobante) con un catálogo `VoucherType` que define el comportamiento: `flow` (`sale` \| `purchase`), `affectsStock` (+1/-1/ninguno), `affectsCurrentAccount` (debe/haber/ninguno), `requiresCae` (sí/no), `isCreditNote`/`isDebitNote` (para saber si el signo de sus efectos se invierte). Ventas y Compras dejan de ser tablas — son **flujos** que atraviesan el mismo motor de comprobantes, tal como ya se hizo con `Party` para Cliente/Proveedor. | Una sola implementación de numeración, impuestos, snapshot de precios, efectos sobre stock/cuenta corriente — se construye una vez y las docenas de tipos de comprobante (Factura A/B/C/E, NC, ND, Recibo, Remito, Orden de Compra, Presupuesto) la reutilizan sin duplicar nada. Consistente con la filosofía ya aplicada al motor de importación CSV ("una abstracción, reutilizada por todo lo que venga después"). Tesorería/Contabilidad futuras leen un solo modelo, no dos. | Requiere que el catálogo `VoucherType` esté bien diseñado desde el principio — si falta un atributo de comportamiento (ej. algo que Compras necesita y Ventas no), agregarlo después es más fácil que en la opción A (una columna nueva en un catálogo chico), pero el diseño inicial de ese catálogo debe ser cuidadoso. |

**Recomendación: B.** Es la misma decisión, con la misma lógica, que ya
tomaste para `Party`/`Customer`/`Supplier` en Sprint 2 — un tercero puede
ser cliente y proveedor a la vez sin duplicar sus datos; acá, una operación
comercial puede ser "de venta" o "de compra" sin duplicar la infraestructura
de comprobantes. Es la opción más escalable para 10 años: cada módulo
futuro que emita o consuma comprobantes (Tesorería, Contabilidad, incluso
un futuro módulo de e-commerce) integra contra un solo modelo.

### 1.5 Motor de impuestos: ¿tasa fija en el producto, o catálogo de impuestos flexible?

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Campo `ivaRate` fijo en `Item`** | Cada producto/servicio tiene un único porcentaje de IVA. | Trivial de implementar. | No modela Percepciones de IIBB (varían por provincia y por condición fiscal del cliente), Percepciones de IVA, exenciones puntuales, ni el hecho de que un mismo ítem puede tributar distinto según la condición fiscal del comprador (Responsable Inscripto vs Consumidor Final vs Exento). Cambiar una alícuota histórica (pasado real: el aumento de IVA a servicios digitales, cambios de categoría) rompe la trazabilidad de comprobantes ya emitidos si no hay snapshot. |
| **B — Catálogo `Tax` + relación `ItemTax` (recomendada)** | `Tax` es un catálogo (IVA 21%, IVA 10.5%, IVA 27%, IVA 0%/Exento, No Gravado, Percepción IIBB [provincia], Percepción IVA, y los que se agreguen después) con `rate`, `type` (IVA/Percepción/Retención), y vigencia (`validFrom`/`validTo`, para que un cambio de alícuota no reescriba historia). `ItemTax` vincula qué impuestos aplican a qué ítem. Al confirmarse un comprobante, cada `VoucherLine` **copia** (snapshot) la tasa vigente ese día — no la vuelve a leer del catálogo después. | Extensible a cualquier régimen impositivo futuro sin tocar el modelo (agregar una fila al catálogo, no una columna a `Item`). Preserva la integridad histórica: un comprobante de 2026 sigue mostrando la tasa de 2026 aunque la alícuota cambie en 2027. | Más piezas para diseñar ahora (catálogo + relación + snapshot en la línea) — pero es exactamente el tipo de flexibilidad que un sistema pensado para 10 años necesita, dado lo cambiante del esquema impositivo argentino. |

**Recomendación: B.** El snapshot en la línea del comprobante (no solo la
tasa, también el monto de impuesto ya calculado) es la pieza no-negociable:
sin eso, cualquier corrección de alícuota futura reescribiría
silenciosamente el total de comprobantes ya cerrados — inaceptable en un
sistema contable.

### 1.6 Costeo de stock: PPP (promedio ponderado) vs FIFO vs costo estándar

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Costo Promedio Ponderado (PPP) — recomendada** | Cada ingreso de stock recalcula un costo promedio único por ítem: `nuevoPromedio = (stockActual × costoActual + cantidadIngresada × costoIngreso) / (stockActual + cantidadIngresada)`. | Simple de calcular y de auditar (un solo número por ítem en un momento dado), es el método más usado en PyMEs argentinas, y es compatible con los informes de costo de AFIP/impuesto a las ganancias sin lógica adicional. | Menos preciso que FIFO cuando hay alta rotación de lotes con costos muy distintos en periodos cortos (relevante en contextos de alta inflación) — se acepta como trade-off consciente. |
| **B — FIFO (primero entrado, primero salido)** | Cada salida de stock consume lotes en el orden en que ingresaron, cada uno con su propio costo. | Más preciso en escenarios de alta inflación o commodities con precio muy volátil. | Requiere modelar "lotes" (`StockLot`) con cantidad remanente por lote — bastante más complejidad de modelo y de consulta (un ítem con miles de movimientos tiene que recorrer sus lotes abiertos en cada salida). |
| **C — Costo estándar** | Se fija un costo "de referencia" por ítem, y la diferencia contra el costo real de compra se registra como una variación aparte. | Útil en manufactura con costos de producción complejos. | No aplica bien a una consultora/comercio que compra y revende — es la solución del problema equivocado para este negocio. |

**Recomendación: A, PPP.** Es la opción estándar de la industria para este
tipo de negocio, la más simple de razonar y auditar, y dejar la puerta
abierta a migrar a FIFO en el futuro no es descartable pero no se justifica
ahora — el campo `averageCost` en `Stock` (por ítem y depósito) alcanza.

### 1.7 Cuenta corriente: ¿una cuenta por `Party`, o cuentas separadas Cliente/Proveedor?

Esta es la única decisión de esta lista que es tanto técnica como de
negocio/legal — la marco explícitamente para tu aprobación, no la resuelvo
solo con criterio técnico.

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Una `CurrentAccount` por `Party`** | Un mismo Tercero que es Cliente y Proveedor a la vez tiene **un solo saldo neto** — lo que le compran y lo que le venden impacta la misma cuenta. | Refleja una práctica real de negocio en Argentina ("compensación de saldos" con un mismo tercero), simplifica la conciliación cuando la relación comercial es bidireccional, y es consistente con el modelo `Party` ya construido. | Mezclar deuda comercial (venderle a crédito) con deuda de compra (comprarle a crédito) en un solo saldo puede no ser deseable para todos los negocios — algunos necesitan ver "cuánto le debo" y "cuánto me debe" como dos números separados, no un neto, por motivos de gestión de cobranza/pago independientes, incluso si el tercero es el mismo. |
| **B — `CustomerAccount` y `SupplierAccount` separadas** | Cada rol de `Party` tiene su propio saldo, igual que `Customer`/`Supplier` ya son extensiones separadas de `Party`. | Separación clara entre "por cobrar" (activo) y "por pagar" (pasivo) — más alineado con cómo un balance contable clásico separa ambas naturalezas, y no obliga a ningún negocio a compensar saldos si no lo desea. | Si dos negocios sí quieren compensar saldos con el mismo tercero, hay que construir esa lógica de compensación como una operación explícita (un asiento/movimiento que mueve saldo de una cuenta a la otra), en vez de que sea automático. |

**Recomendación provisoria: B** (cuentas separadas, siguiendo el mismo
patrón de extensión por rol que `Customer`/`Supplier`), con una operación
explícita de "compensación de saldos entre cuentas del mismo Party" como
mejora incremental si algún negocio piloto la necesita — es más fácil
agregar una operación de compensación explícita sobre cuentas separadas que
"despegar" un saldo neto ya mezclado en una sola cuenta si después se
necesita verlo separado. Pero esta es tu decisión de negocio, no solo mía:
**pido que la confirmes o la cambies explícitamente antes de continuar.**

### 1.8 Cobros y pagos: ¿un comprobante = un pago, o un pago se puede repartir entre comprobantes y medios?

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Relación 1 a 1** (cada Factura tiene a lo sumo un Recibo de pago total) | Simple: `Voucher` de tipo Recibo referencia un único `Voucher` de Factura. | Trivial de modelar (ya está cubierto por 1.4, no necesita nada nuevo). | No refleja la realidad de cobranza/pago: un cliente suele pagar **varias facturas juntas** con un solo pago, o pagar **una factura parcialmente**, o pagar **parte en efectivo y parte con transferencia**. Forzar 1 a 1 obliga al usuario a hacer recibos parciales manuales para cada combinación, en vez de que el sistema lo permita naturalmente. |
| **B — `Payment` con imputación muchos-a-muchos (recomendada)** | `Payment` (Cobro/Pago) es su propia entidad — no un tipo de `Voucher` — con una tabla puente `PaymentAllocation` (`paymentId`, `voucherId`, `amountApplied`) que permite que un pago cubra total o parcialmente uno o varios comprobantes, y otra tabla `PaymentMethodDetail` (`paymentId`, `paymentMethodId`, `amount`, detalle específico del medio) que permite que un mismo pago se divida entre efectivo/transferencia/tarjeta. | Modela la realidad de cobranza sin restricciones artificiales; es el diseño que usan Tango, Bejerman, Odoo y la mayoría de los ERPs con módulo de Tesorería. Un pago no aplicado a ningún comprobante (a cuenta) es simplemente un `Payment` sin filas en `PaymentAllocation` — el saldo queda a favor en la Cuenta Corriente automáticamente. | Es más piezas de modelo que la opción A, pero es exactamente donde un diseño simplificado hoy generaría el mayor dolor de refactor en 2-3 años, cuando el negocio real empiece a necesitar pagos combinados. |

**Recomendación: B.**

### 1.9 El enganche hacia Asientos contables futuros

No se construye el Plan de Cuentas ni el Libro Diario en Sprint 3 — pero el
diseño de todo lo anterior debe dejar el terreno listo, igual que se hizo
con RLS (diseño ahora, implementación después). El principio: **todo hecho
económico que algún día genera un asiento ya tiene, desde que se crea, un
monto, una fecha, una moneda y una clasificación clara** (tipo de
comprobante, tipo de movimiento de caja/banco). No se agrega ninguna tabla
de contabilidad ahora — se verifica, entidad por entidad, que ninguna de
las que se diseñan en este documento tenga datos "sueltos" que un futuro
motor contable no pueda mapear a una cuenta contable sin tener que volver a
tocar el modelo. Esto se revisa explícitamente en cada sección siguiente
(marcado como "Listo para Contabilidad futura: sí/no").

---

## 2. Productos y Servicios

### 2.1 Regla de negocio central

Un **Producto** controla stock; un **Servicio** no. Comparten casi todo lo
demás: nombre, categoría, impuestos aplicables, presencia en listas de
precios, uso como línea de un comprobante.

### 2.2 Alternativa de modelado

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Tablas separadas** `Product`/`Service` | Cada uno con su propio CRUD, como Cliente/Proveedor antes de Sprint 2. | Sencillo. | Repite exactamente el problema que `Party` resolvió: un ítem no cambia de "ser producto" a "ser servicio", así que no hay razón real para separar toda la infraestructura (categoría, impuestos, precios, líneas de comprobante) en dos jerarquías paralelas. |
| **B — Entidad única `Item` con discriminador `type` (`PRODUCT` \| `SERVICE`) — recomendada** | Una tabla `Item` con los campos comunes (nombre, código/SKU, categoría, unidad de medida, impuestos aplicables, activo) y campos específicos de `PRODUCT` nulables (`tracksStock`, `minimumStock`) que simplemente no se usan si `type = SERVICE`. | Un único catálogo, una única pantalla de alta con un selector de tipo, una única relación con `PriceList`/`Tax`/`VoucherLine` — el 90% del código de "ítem" no necesita saber si es producto o servicio. | A diferencia de `Party`/`Customer`/`Supplier` (donde un mismo Tercero **podía** tener ambos roles a la vez), acá un ítem es **uno u otro, nunca ambos** — por eso no se replica el patrón de extensión por rol de Sprint 2 (generaría la complejidad de tablas al estilo `Customer`/`Supplier` sin el caso de uso real de dualidad que lo justificaba); un discriminador simple con campos nulables alcanza. |

**Recomendación: B.**

### 2.3 Modelo de datos propuesto

- **`Item`**: `id` (UUID v4), `companyId`, `type` (`PRODUCT`\|`SERVICE`),
  `sku` (código interno, único por empresa), `name`, `description`,
  `categoryId`, `unitOfMeasure` (unidad, ej. "unidad"/"kg"/"hora"),
  `tracksStock` (bool, solo relevante si `type = PRODUCT` — permite un
  producto que NO controla stock, ej. un servicio facturado como ítem de
  catálogo), `minimumStock` (nullable, alerta de reposición),
  `isActive`, auditoría estándar.
- **`ItemTax`**: `itemId`, `taxId` — qué impuestos aplican a este ítem
  (ver §4).

**Listo para Contabilidad futura**: sí — cada `Item` tendrá, cuando se
diseñe el Plan de Cuentas, un mapeo a una cuenta de ingresos/costo vía
`categoryId` (ver §3), sin necesitar cambios en `Item` mismo.

---

## 3. Categorías

### 3.1 Regla de negocio

Clasificación jerárquica de `Item` (ej. "Insumos de oficina" > "Papelería"
> "Resmas de papel"), reutilizable para reportes y, a futuro, para mapear
categorías a cuentas contables de ingresos/costos.

### 3.2 Alternativa de modelado

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Lista de adyacencia (`parentId` autoreferenciado) — recomendada** | `Category` con `parentId` nullable apuntando a otra `Category` de la misma empresa. Profundidad ilimitada. | Simple, estándar, Postgres soporta consultas recursivas (`WITH RECURSIVE`) nativamente para "traer todos los descendientes" cuando se necesite. | A profundidades muy grandes (no es el caso esperado — categorías de catálogo comercial rara vez pasan de 3-4 niveles) las consultas recursivas son más costosas que un modelo de "ruta materializada", pero no se justifica esa complejidad para este volumen. |
| **B — Niveles fijos** (`Category1`, `Category2`, `Category3`) | Columnas fijas en `Item` en vez de una tabla aparte. | Consultas triviales, sin recursión. | Rígido: el día que un negocio necesite un cuarto nivel, es una migración de esquema, no un dato nuevo. Descartada — el documento fuente no pide una profundidad fija y no hay ninguna razón de negocio para imponerla. |

**Recomendación: A.**

### 3.3 Modelo de datos propuesto

- **`Category`**: `id`, `companyId`, `parentId` (nullable), `name`,
  `isActive`. Índice `(companyId, parentId)` para listar hijos directos
  eficientemente.

**Listo para Contabilidad futura**: sí, en la medida en que se diseñe —
cuando exista Plan de Cuentas, `Category` podrá llevar una referencia
opcional a una cuenta contable de ingresos y otra de costo; no se agrega
ahora, pero el modelo no necesita rediseño para incorporarla (una columna
nueva nullable).

---

## 4. Impuestos

Ver decisión transversal §1.5 (catálogo flexible, recomendado). Modelo:

- **`Tax`**: `id`, `companyId` (o global de plataforma si se decide
  compartir el catálogo entre empresas — a definir cuando se diseñe
  Sprint 3 en detalle, no bloqueante para este documento), `name` (ej.
  "IVA 21%"), `type` (`VAT`\|`PERCEPTION`\|`WITHHOLDING`), `rate`
  (`Decimal`), `validFrom`, `validTo` (nullable — vigente hasta que se
  cierre).
- **`ItemTax`**: qué impuestos aplican a qué `Item` (ver §2.3).
- El **snapshot** ocurre en `VoucherLine` (§10), no acá — el catálogo
  `Tax` es la fuente de verdad *actual*, cada línea de comprobante copia
  la tasa vigente al momento de confirmarse.

**Listo para Contabilidad futura**: sí — cada `Tax` mapea naturalmente a
una cuenta contable de "IVA Débito Fiscal"/"IVA Crédito Fiscal"/
"Percepciones a favor", vía una columna que se agrega cuando exista Plan
de Cuentas.

---

## 5. Lista de precios

### 5.1 Regla de negocio

Un mismo `Item` puede tener precios distintos según lista (minorista,
mayorista, por segmento de cliente) y según moneda.

### 5.2 Decisión: ¿precio neto o precio con impuestos incluidos?

Recomendación: **precio neto** (sin impuestos) como valor canónico
almacenado. Los impuestos se calculan y discriminan al momento de generar
el comprobante (consistente con §1.5 — el motor de impuestos vive aparte
del precio). Guardar el precio "final con IVA incluido" mezclaría dos
conceptos que cambian por separado (el precio de lista lo decide el
negocio; la alícuota de IVA la decide AFIP) y complicaría cualquier reporte
que necesite ver el neto solo.

### 5.3 Modelo de datos propuesto

- **`PriceList`**: `id`, `companyId`, `name` (ej. "Minorista",
  "Mayorista"), `currency`, `isDefault`, `validFrom`, `validTo` (nullable),
  `isActive`.
- **`PriceListItem`**: `priceListId`, `itemId`, `price` (neto, `Decimal`).
  Único por `(priceListId, itemId)`.
- Asociación `Customer` → `PriceList` preferida (nullable — si no tiene
  una asignada, se usa la lista marcada `isDefault` de la empresa):
  agrega una columna `preferredPriceListId` a `Customer` (ya existe esa
  tabla desde Sprint 2).

**Listo para Contabilidad futura**: no aplica directamente — la lista de
precios no genera asientos por sí misma, solo alimenta el precio de la
línea del comprobante, que sí está listo (ver §10).

---

## 6. Stock

### 6.1 Regla de negocio

Cantidad disponible de cada `Item` que `tracksStock = true`, por depósito.
Nunca se edita directamente — solo cambia como consecuencia de un
`StockMovement` (§7).

### 6.2 Decisión: ¿stock por empresa, o por depósito/sucursal?

**Recomendación**: por depósito. Se introduce `Warehouse` (Depósito) —
uno o más por `Branch` (ya existe `Branch` desde Sprint 1) — porque una
empresa con varias sucursales casi siempre necesita saber cuánto stock hay
**en cada una**, no solo el total. Cada empresa nueva arranca con un
depósito "Principal" creado automáticamente junto a su primera sucursal.

### 6.3 Decisión: ¿tabla de stock materializada, o calculada al vuelo sumando movimientos?

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Calculado al vuelo** (`SUM` sobre `StockMovement` en cada consulta) | No hay tabla `Stock` — se agrega en cada lectura. | Cero riesgo de desincronización entre el ledger y el "resumen". | A millones de movimientos por ítem/depósito en 10 años, cada consulta de "¿cuánto stock tengo de X?" (la más frecuente del sistema, se ejecuta en cada venta) se vuelve progresivamente más lenta. Inaceptable a largo plazo. |
| **B — Tabla `Stock` materializada, actualizada en la misma transacción que cada `StockMovement` — recomendada** | `Stock` (itemId, warehouseId, quantity, averageCost) se actualiza como parte de la misma transacción de Unit of Work que crea el `StockMovement` — nunca por separado, nunca en un job asincrónico que podría desincronizarse. | Lectura de stock actual en O(1) (una fila), sin importar cuántos movimientos históricos existan. `StockMovement` sigue siendo la fuente de verdad auditable (RN-009) — `Stock` es una vista materializada de su acumulado, reconstruible desde cero si alguna vez hiciera falta (recalculo de auditoría/corrección). | Requiere disciplina: **todo** cambio de stock debe pasar por el mismo caso de uso/servicio de dominio que mantiene ambas tablas sincronizadas dentro de la misma transacción — nunca un `UPDATE` directo a `Stock` desde otro lugar. Se documenta como regla dura del módulo. |

**Recomendación: B.**

### 6.4 Reserva de stock (a futuro)

Un pedido de venta confirmado pero no despachado podría "reservar" stock
sin todavía descontarlo físicamente. **No se construye en Sprint 3** — se
deja documentado que `Stock` tendrá, cuando se necesite, una columna
`reservedQuantity` separada de `quantity` (disponible = quantity -
reservedQuantity), sin requerir rediseño.

**Listo para Contabilidad futura**: sí — cada `StockMovement` (§7) lleva
su propio costo (`unitCost`, tomado de `averageCost` al momento del
movimiento), suficiente para que un futuro asiento de "Costo de Mercadería
Vendida" se genere sin datos adicionales.

---

## 7. Movimientos de stock

### 7.1 Regla de negocio

Ledger inmutable (append-only, igual que `AuditLog`) de cada entrada o
salida de stock. Nunca se edita ni se borra un movimiento — una corrección
se hace con un movimiento de ajuste nuevo, en sentido contrario, nunca
modificando el original.

### 7.2 Modelo de datos propuesto

- **`StockMovement`** (UUID v7, ver §1.1): `id`, `companyId`, `itemId`,
  `warehouseId`, `type` (`PURCHASE_IN`, `SALE_OUT`, `ADJUSTMENT_IN`,
  `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `RETURN_IN`,
  `RETURN_OUT`), `quantity` (siempre positivo; el signo lo da `type`),
  `unitCost` (snapshot del costo en ese momento), `voucherId` (nullable —
  presente cuando el movimiento viene de un Comprobante confirmado;
  ausente en un ajuste manual), `reason` (obligatorio si `voucherId` es
  nulo — motivo del ajuste manual), `userId`, `createdAt`.
- Transferencia entre depósitos se modela como **dos filas** (`TRANSFER_OUT`
  en el origen + `TRANSFER_IN` en el destino), vinculadas por un
  `transferGroupId` compartido — mantiene el mismo tipo de movimiento
  simple en vez de una tabla de "transferencia" con dos referencias de
  depósito.

### 7.3 Regla de negocio: stock negativo

**Decisión pendiente de tu confirmación**: ¿se permite vender con stock
insuficiente (backorder), o se bloquea la venta? Recomendación: **bloqueo
por defecto, configurable por empresa** (`Company.allowNegativeStock`,
nuevo campo booleano) — algunos negocios (ej. venta bajo pedido) sí
necesitan permitirlo.

**Listo para Contabilidad futura**: sí (ver §6.4).

---

## 8. Ventas y Compras

Con la decisión §1.4 (Comprobante único), **Ventas y Compras dejan de ser
tablas propias** — son un `flow` (`SALE`\|`PURCHASE`) del catálogo
`VoucherType`, y un filtro sobre el mismo `Voucher`. Todo lo que sigue en
§9-10 aplica a ambas por igual. Esta sección documenta únicamente las
reglas de negocio que **sí difieren** entre uno y otro flujo:

| Regla | Ventas | Compras |
|---|---|---|
| Contraparte (`partyId`) | `Customer` (rol Cliente del `Party`) | `Supplier` (rol Proveedor del `Party`) |
| Efecto en stock | Egreso (`affectsStock = -1`) | Ingreso (`affectsStock = +1`) |
| Efecto en cuenta corriente | Debe del cliente (nos deben) | Haber al proveedor (les debemos) — ver §15 |
| Requiere CAE (AFIP) | Sí, para comprobantes fiscales (Factura/NC/ND) | No — la factura de compra es la que emite el proveedor, no la empresa |
| Lista de precios aplicada | `PriceList` de venta (§5) | Costo real informado por el proveedor en la línea (no viene de una lista propia) |

**Listo para Contabilidad futura**: sí, en ambos flujos — cada `Voucher`
lleva todo lo necesario (§9.3) para mapear a un asiento de Ventas/IVA
Débito o Compras/IVA Crédito según su `flow`.

---

## 9. Comprobantes

### 9.1 Regla de negocio

Documento comercial/fiscal — Factura A/B/C/E, Nota de Crédito/Débito A/B/C,
Recibo, Remito, Orden de Compra, Presupuesto. Ciclo de vida: **Borrador**
(editable, sin numerar, sin efectos) → **Confirmado** (numerado
secuencialmente, con CAE si corresponde, dispara efectos en stock/cuenta
corriente, inmutable) → **Anulado** (solo mediante una Nota de Crédito/
Débito si ya tuvo efectos confirmados, o anulación directa si seguía en
Borrador — nunca `DELETE` físico, consistente con RN-003 de Sprint 1).

### 9.2 Catálogo `VoucherType`

- `code` (ej. `FA_A`, `FA_B`, `NC_A`, `REC`, `REM`, `OC`, `PRES`),
  `name`, `flow` (`SALE`\|`PURCHASE`\|`NEUTRAL` — Remito/Presupuesto no
  mueven cuenta corriente), `affectsStock` (`IN`\|`OUT`\|`NONE`),
  `affectsCurrentAccount` (`DEBIT`\|`CREDIT`\|`NONE`), `requiresCae`
  (bool), `isCreditNote`/`isDebitNote` (bool, invierte el signo de los
  efectos del comprobante que referencia), `relatedVoucherRequired` (bool
  — una NC/ND normalmente referencia el comprobante que ajusta).

### 9.3 Modelo de datos propuesto

- **`Voucher`** (UUID v7): `id`, `companyId`, `branchId`, `voucherTypeId`,
  `pointOfSaleId`, `number` (entero, asignado por `VoucherCounter` — ver
  §1.3), `partyId`, `issueDate`, `currency`, `exchangeRate` (ver §1.2),
  `status` (`DRAFT`\|`CONFIRMED`\|`CANCELLED`), `relatedVoucherId`
  (nullable, para NC/ND), `subtotal`, `taxTotal`, `total` (todos
  `Decimal`, calculados a partir de las líneas al confirmar — nunca
  editados manualmente), `cae`, `caeExpirationDate` (nullable),
  auditoría estándar.
- Único `(companyId, pointOfSaleId, voucherTypeId, number)` — la
  numeración fiscal no admite duplicados.

**Listo para Contabilidad futura**: sí — `voucherTypeId` clasifica el
hecho económico, `total`/`taxTotal` están discriminados, `partyId`
identifica la contraparte — todo lo que un asiento automático de
Ventas/Compras necesitaría.

---

## 10. Detalle de comprobantes

### 10.1 Regla de negocio: snapshot, no referencia viva

Cada línea **copia** el precio y la tasa de impuesto vigentes al momento
de confirmar el comprobante — nunca vuelve a leer `PriceList`/`Tax` para
recalcular un comprobante ya confirmado, ni siquiera para mostrarlo. Esta
es una regla de integridad contable, no una optimización.

### 10.2 Modelo de datos propuesto

- **`VoucherLine`** (UUID v7): `id`, `voucherId`, `lineNumber`, `itemId`
  (nullable — permite una línea de texto libre sin ítem de catálogo,
  frecuente en Servicios facturados ad-hoc), `description` (snapshot del
  nombre del ítem al momento, o texto libre), `quantity`, `unitPrice`
  (snapshot, neto), `discountPercentage`, `subtotal` (calculado:
  `quantity × unitPrice × (1 - discountPercentage)`).
- **`VoucherLineTax`**: `voucherLineId`, `taxId`, `rate` (snapshot),
  `amount` (snapshot del monto de impuesto calculado) — permite que una
  misma línea tenga más de un impuesto aplicado (ej. IVA + Percepción
  IIBB simultáneamente).

**Listo para Contabilidad futura**: sí — es la tabla más granular, la que
un futuro asiento detallado (por categoría de ítem, por tipo de impuesto)
necesitaría leer.

---

## 11. Caja

### 11.1 Regla de negocio

Control de efectivo por punto de cobro físico, con apertura (saldo
inicial) y cierre (saldo final, diferencia/arqueo) de turno.

### 11.2 Decisión: ¿caja por sucursal compartida, o caja por usuario/turno?

**Recomendación**: `CashRegister` (la caja física, uno o más por
`Branch`) + `CashSession` (una apertura/cierre, con `openedByUserId`,
`openingBalance`, `closedByUserId` nullable, `closingBalance` nullable,
`expectedBalance` calculado, `difference`). Un `CashRegister` solo puede
tener **una** `CashSession` abierta a la vez (constraint de aplicación,
reforzada con una consulta antes de abrir una nueva) — evita que dos
turnos se mezclen sobre la misma caja física.

### 11.3 Modelo de datos propuesto

- **`CashRegister`**: `id`, `companyId`, `branchId`, `name`, `isActive`.
- **`CashSession`**: `id`, `cashRegisterId`, `openedByUserId`,
  `openingBalance`, `openedAt`, `closedByUserId` (nullable),
  `closingBalance` (nullable), `closedAt` (nullable).
- **`CashMovement`** (UUID v7): `id`, `cashSessionId`, `type`
  (`IN`\|`OUT`), `amount`, `paymentId` (nullable — presente cuando el
  movimiento viene de un `Payment`, ver §14), `reason` (obligatorio si
  `paymentId` es nulo), `createdAt`.

**Listo para Contabilidad futura**: sí — cada `CashMovement` tiene monto,
fecha y origen (`paymentId` o motivo manual), suficiente para un asiento
de "Caja".

---

## 12. Bancos

### 12.1 Regla de negocio

Cuentas bancarias propias de la empresa, con sus movimientos (depósitos,
extracciones, acreditación de cobros, débito de pagos).

### 12.2 Modelo de datos propuesto

- **`BankAccount`**: `id`, `companyId`, `bankName`, `accountType`
  (`CHECKING`\|`SAVINGS`), `accountNumber`, `cbu`, `alias`, `currency`,
  `isActive`.
- **`BankMovement`** (UUID v7): `id`, `bankAccountId`, `type`
  (`DEPOSIT`\|`WITHDRAWAL`), `amount`, `paymentId` (nullable),
  `description`, `date`, `isReconciled` (bool, default `false`),
  `reconciledAt` (nullable) — el campo de conciliación se agrega desde
  ahora aunque la lógica de conciliación bancaria (matching automático
  contra extracto importado) **no se construye en Sprint 3**.

**Listo para Contabilidad futura**: sí — mismo patrón que `CashMovement`.

---

## 13. Medios de pago

### 13.1 Regla de negocio

Catálogo de formas de cobro/pago: Efectivo, Cheque, Transferencia
Bancaria, Tarjeta de Débito, Tarjeta de Crédito, Cuenta Corriente (pagar
"a cuenta", sin movimiento de caja/banco real, solo ajusta el saldo).

### 13.2 Decisión: ¿detalle genérico o extensión por tipo de medio?

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A — Campo JSON genérico** `detail: Json` en `PaymentMethodDetail` | Cada tipo de medio guarda su propia forma libre. | Máxima flexibilidad, cero tablas nuevas por medio. | Ningún constraint de base de datos, ninguna validación estructural (ej. que un cheque tenga fecha de cobro), y una consulta como "cheques a vencer esta semana" necesita filtrar dentro de un JSON en vez de una columna indexada — mala idónea para algo con reglas de negocio reales (seguimiento de fecha de cobro/rechazo de cheques). |
| **B — Extensión por tipo con tablas dedicadas para los medios con reglas propias — recomendada** | `PaymentMethod` (catálogo: Efectivo/Cheque/Transferencia/Tarjeta Débito/Tarjeta Crédito/Cuenta Corriente) + tablas de detalle **solo** para los que tienen datos y reglas propias: `CheckDetail` (número, banco emisor, fecha de cobro, `status`: en cartera/depositado/rechazado/cobrado), `CardDetail` (tipo, cupón, lote, entidad de liquidación). Efectivo/Transferencia/Cuenta Corriente no necesitan tabla de detalle — el monto y la referencia genérica alcanzan. | Mismo patrón de extensión ya usado en `Customer`/`Supplier`: cada medio de pago extiende con exactamente los campos que necesita, con tipos y constraints reales (ej. `CheckDetail.dueDate` como `DateTime` indexable). | Más tablas que la opción A, pero solo donde el negocio real lo justifica (2 tablas de extensión, no una por cada medio). |

**Recomendación: B.**

---

## 14. Pagos y cobros (`Payment`)

Entidad que faltaba nombrar explícitamente en la lista original pero que
la decisión §1.8 requiere como pieza propia (no es "Medios de pago", es
quien los usa):

- **`Payment`**: `id`, `companyId`, `partyId`, `direction`
  (`COLLECTION`\|`PAYMENT` — cobro o pago), `date`, `totalAmount`,
  `currency`, `exchangeRate`.
- **`PaymentAllocation`**: `paymentId`, `voucherId`, `amountApplied` —
  permite pagos parciales y pagos que cubren varios comprobantes.
- **`PaymentMethodDetail`**: `paymentId`, `paymentMethodId`, `amount`,
  `checkDetailId`/`cardDetailId` (nullable, según corresponda) — permite
  dividir un pago entre varios medios.

Un `Payment` genera, según corresponda: una fila en `CurrentAccountMovement`
(siempre), una fila en `CashMovement` (si algún `PaymentMethodDetail` es
Efectivo), una fila en `BankMovement` (si algún `PaymentMethodDetail` es
Transferencia/Tarjeta liquidada en banco) — las tres dentro de la misma
transacción de `UnitOfWork`.

---

## 15. Cuentas corrientes

Ver decisión de negocio §1.7 (**pendiente tu confirmación explícita**).
Modelo de datos (válido para cualquiera de las dos opciones de §1.7, solo
cambia si la FK apunta a `Party` o a `Customer`/`Supplier`):

- **`CurrentAccount`**: `id`, `companyId`, `partyId` (o `customerId`/
  `supplierId` según se resuelva §1.7), `currency`, `currentBalance`
  (materializado, mismo patrón que `Stock` — se actualiza en la misma
  transacción que cada movimiento, nunca por separado).
- **`CurrentAccountMovement`** (UUID v7): `id`, `currentAccountId`,
  `type` (`DEBIT`\|`CREDIT`), `amount`, `voucherId` (nullable),
  `paymentId` (nullable), `balanceAfter` (snapshot del saldo resultante,
  para poder mostrar un estado de cuenta histórico sin recalcular sumas
  acumuladas cada vez).
- **Convención de signo** (a fijar explícitamente, recomendada): saldo
  positivo = *nos deben* (el `Party` tiene una deuda con la empresa);
  saldo negativo = *les debemos*. Aplica igual tanto si se usa una cuenta
  única (§1.7-A) como separadas (§1.7-B, donde `CustomerAccount` casi
  siempre será positivo y `SupplierAccount` casi siempre negativo, por la
  naturaleza de cada relación).

**Listo para Contabilidad futura**: sí — cada movimiento tiene tipo,
monto, origen (`voucherId`/`paymentId`) y saldo resultante.

---

## 16. Asientos contables futuros — qué NO se construye ahora

Explícitamente fuera de alcance de Sprint 3: `ChartOfAccounts` (Plan de
Cuentas), `JournalEntry`/`JournalEntryLine` (Asiento/Líneas de asiento con
Debe/Haber), y cualquier lógica de generación automática de asientos desde
`Voucher`/`CashMovement`/`BankMovement`. Cada sección anterior documentó
explícitamente "Listo para Contabilidad futura: sí" — la verificación
consciente de que ningún dato necesario para un asiento queda fuera del
modelo actual es, en sí, el entregable de esta sección. Cuando se diseñe
el módulo de Contabilidad (post-Sprint 3, alcance a definir aparte), el
patrón esperado es: cada `Voucher` confirmado, cada `CashMovement`, cada
`BankMovement` disparan (dentro de la misma transacción de Unit of Work
que los crea) la generación de un `JournalEntry` derivado, usando
`categoryId`/`voucherTypeId`/`taxId` como mapeo hacia las cuentas del Plan
de Cuentas — sin necesitar tocar ninguna de las tablas de este documento.

---

## 17. Resumen de entidades y relaciones

| Entidad | Pertenece a | Referencia a | Volumen esperado (10 años) |
|---|---|---|---|
| `Item` | `Company` | `Category` | Cientos a miles |
| `Category` | `Company` | `Category` (self) | Decenas a cientos |
| `Tax` | `Company` (o plataforma) | — | Decenas |
| `ItemTax` | — | `Item`, `Tax` | = `Item` × impuestos aplicables |
| `PriceList` | `Company` | — | Unidades a decenas |
| `PriceListItem` | — | `PriceList`, `Item` | = `PriceList` × `Item` |
| `Warehouse` | `Branch` | — | Unidades a decenas |
| `Stock` | — | `Item`, `Warehouse` | = `Item` × `Warehouse` |
| `StockMovement` | `Company` | `Item`, `Warehouse`, `Voucher` (opc.) | **Alto — millones** |
| `PointOfSale` | `Branch` | — | Unidades |
| `VoucherType` | Plataforma (catálogo fijo) | — | Decenas |
| `VoucherCounter` | `Company` | `PointOfSale`, `VoucherType` | = `PointOfSale` × `VoucherType` |
| `Voucher` | `Company` | `Party`, `VoucherType`, `PointOfSale` | **Alto — millones** |
| `VoucherLine` | `Voucher` | `Item` (opc.) | **Muy alto — decenas de millones** |
| `VoucherLineTax` | `VoucherLine` | `Tax` | = `VoucherLine` × impuestos |
| `CashRegister` | `Branch` | — | Unidades |
| `CashSession` | `CashRegister` | — | Miles (una por turno) |
| `CashMovement` | `CashSession` | `Payment` (opc.) | **Alto — millones** |
| `BankAccount` | `Company` | — | Unidades |
| `BankMovement` | `BankAccount` | `Payment` (opc.) | **Alto — millones** |
| `PaymentMethod` | Plataforma (catálogo) | — | Decenas |
| `CheckDetail`/`CardDetail` | — | `PaymentMethodDetail` | = pagos con ese medio |
| `Payment` | `Company` | `Party` | **Alto — millones** |
| `PaymentAllocation` | `Payment` | `Voucher` | = `Payment` × comprobantes cubiertos |
| `PaymentMethodDetail` | `Payment` | `PaymentMethod` | = `Payment` × medios usados |
| `CurrentAccount` | `Company` | `Party` (o `Customer`/`Supplier`, según §1.7) | = terceros con cuenta |
| `CurrentAccountMovement` | `CurrentAccount` | `Voucher`/`Payment` (opc.) | **Alto — millones** |

Las filas marcadas "Alto"/"Muy alto" son exactamente las que llevan UUID
v7 (§1.1) y las primeras candidatas a particionado por fecha cuando el
volumen lo justifique (§0.4, heredado).

---

## 18. Orden de implementación sugerido (para cuando apruebes este documento)

Dado el tamaño del alcance, se recomienda dividir Sprint 3 en sub-módulos
secuenciales — cada uno documentado, implementado y probado antes de
empezar el siguiente, exactamente como se hizo con Empresas→Usuarios en
Sprint 1 y con Clientes/Proveedores en Sprint 2:

1. **Sprint 3.1 — Catálogo maestro**: `Category`, `Item`, `Tax`,
   `ItemTax`, `PriceList`, `PriceListItem`. Sin transacciones todavía —
   son catálogos de bajo volumen, CRUD directo.
2. **Sprint 3.2 — Stock**: `Warehouse`, `Stock`, `StockMovement` (con
   movimientos manuales de ajuste — sin comprobantes todavía, porque
   Comprobantes depende de Stock para calcular sus efectos pero Stock no
   depende de Comprobantes).
3. **Sprint 3.3 — Comprobantes**: `PointOfSale`, `VoucherType`,
   `VoucherCounter`, `Voucher`, `VoucherLine`, `VoucherLineTax` — el
   motor de numeración, snapshot de precios/impuestos, y efectos sobre
   Stock (integra con 3.2). Ventas y Compras quedan implementados como
   flujos de este mismo motor, sin módulos separados.
4. **Sprint 3.4 — Medios de pago y Tesorería**: `PaymentMethod`,
   `CheckDetail`, `CardDetail`, `Payment`, `PaymentAllocation`,
   `PaymentMethodDetail`, `CurrentAccount`, `CurrentAccountMovement`.
5. **Sprint 3.5 — Caja y Bancos**: `CashRegister`, `CashSession`,
   `CashMovement`, `BankAccount`, `BankMovement` — dependen de 3.4
   (`Payment`) para saber qué movimiento generar.

Contabilidad (Plan de Cuentas, Asientos) queda **fuera de este alcance**,
como Sprint 4+ separado.

---

## 19. Checklist de decisiones que requieren tu aprobación explícita

| # | Decisión | Mi recomendación | Tu resolución |
|---|---|---|---|
| 1.1 | IDs de tablas de alto volumen | UUID v7 | ⬜ |
| 1.2 | Multi-moneda desde ahora (campos, sin motor de conversión) | Sí | ⬜ |
| 1.3 | Numeración fiscal con contador transaccional; CAE fuera de alcance de Sprint 3 | Aprobar diseño, diferir integración AFIP | ⬜ |
| 1.4 | Comprobante único polimórfico para Ventas y Compras | Sí | ⬜ |
| 1.5 | Catálogo de impuestos flexible + snapshot en línea | Sí | ⬜ |
| 1.6 | Costeo por Promedio Ponderado (PPP) | Sí | ⬜ |
| **1.7** | **Cuenta corriente: única por `Party` vs separada Cliente/Proveedor** | **Separada (B), pero es tu decisión de negocio** | ⬜ **— requiere tu respuesta explícita** |
| 1.8 | `Payment` con imputación muchos-a-muchos a comprobantes y medios | Sí | ⬜ |
| 7.3 | Bloqueo de stock negativo por defecto, configurable por empresa | Sí | ⬜ |
| 11.2 | Caja por sucursal con sesiones por turno/usuario | Sí | ⬜ |
| 13.2 | Extensión por tipo de medio de pago (Cheque/Tarjeta con tabla propia) | Sí | ⬜ |
| 18 | Dividir Sprint 3 en 5 sub-sprints secuenciales | Sí | ⬜ |

Quedo a la espera de tu aprobación (o de tus ajustes) sobre este documento
completo, con especial atención a la Decisión 1.7, antes de escribir
cualquier código, migración o test de Sprint 3.
