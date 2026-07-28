# Frontend — Navegación y experiencia de usuario

> Depende de `00-arquitectura-frontend.md` y `01-organizacion-y-estado.md`.
> El objetivo declarado por el usuario es "simple e intuitiva, preparada
> para crecer comercialmente" — este documento traduce eso en decisiones
> concretas de layout y flujo, no solo una lista de pantallas.

## 1. Estructura general (shell autenticado)

```
┌─────────────────────────────────────────────────────────┐
│ [≡] ESTRATEGOS   [Empresa Piloto SRL ▾]      [Usuario ▾] │  ← topbar
├───────────┬─────────────────────────────────────────────┤
│ Inicio    │                                             │
│ Clientes  │                                             │
│ Proveed.  │              <contenido de la ruta>         │
│ Catálogo  │                                             │
│ Stock     │                                             │
│ Comprob.  │                                             │
│ Tesorería │                                             │
│ Caja/Banc │                                             │
│ Contabil. │                                             │
│ ────────  │                                             │
│ Config.   │                                             │
└───────────┴─────────────────────────────────────────────┘
```

- **Sidebar** (colapsable, estado en `useUiStore`, §4 del doc 01): un
  ítem por módulo de negocio, en el mismo orden en que se construyeron
  (refleja dependencias reales: Catálogo antes que Stock, Stock antes que
  Comprobantes, Tesorería antes que Caja/Bancos). "Configuración" separado
  al pie porque es administrativo, no operativo diario.
- **Selector de empresa** en el topbar (`CompanySwitcher`): cambia el
  `[companyId]` de la URL — nunca oculta detrás de un menú de tercer
  nivel, porque es la decisión más consecuente que un usuario multi-
  empresa toma en cada sesión (ver `00-arquitectura-frontend.md` §2.4).
  Al cambiar, redirige a `inicio` de la nueva empresa, no intenta
  reproducir la misma sub-ruta (evita mostrar un comprobante de la
  empresa A con companyId de la B por un instante).
- **Ítems de menú visibles según rol**: el rol viene del backend
  (`CurrentRoleName`, ya resuelto server-side); el sidebar oculta
  "Configuración → Usuarios" para roles sin permiso de gestión, en vez de
  mostrarlo y rechazar al hacer clic — evitar callejones sin salida es
  parte de "intuitivo".

## 2. Patrones de pantalla, estandarizados entre módulos

Todas las pantallas de listado (`clientes/`, `catalogo/items/`,
`comprobantes/`, etc.) comparten estructura, para que aprender una sea
aprenderlas todas:

```
[Buscar...............] [Filtro: Estado ▾] [Filtro: ...]      [+ Nuevo]
┌──────────────────────────────────────────────────────────┐
│ Columna 1   Columna 2   Columna 3   Estado    Acciones    │
│ ...                                                       │
└──────────────────────────────────────────────────────────┘
                                            ‹ 1 2 3 ... 12 ›
```

- Búsqueda y filtros van a la URL (query string), no a estado local —
  ver doc 01 §4.
- La columna "Estado" siempre es un `StatusBadge` (activo/inactivo,
  abierta/cerrada) con el mismo código de color en toda la app.
- "Acciones" es un menú de tres puntos: Ver, Editar, Desactivar/Activar —
  nunca botones sueltos por fila (no escala visualmente más allá de 2
  acciones).
- Fila vacía: mensaje + el mismo botón "+ Nuevo" del header, nunca una
  pantalla en blanco sin salida.

Las pantallas de alta/edición son un panel lateral deslizante (`Sheet` de
shadcn/ui) para entidades simples de un paso (Cliente, Proveedor,
Categoría, Depósito) y una página completa para las que tienen múltiples
secciones o líneas dinámicas (Comprobante, Pago, Asiento manual) — la
regla es "si entra cómodo en un formulario de una columna, es un panel;
si tiene una tabla de líneas adentro, es una página".

## 3. Flujos críticos (los que concentran la complejidad de negocio)

### 3.1 Alta de Comprobante (Factura / Nota de Crédito)

El flujo más largo de la aplicación, con validaciones en cascada que ya
existen en el backend y que la UI debe reflejar en vivo, no solo al
enviar:

1. Elegir **tipo de comprobante** (Factura A/B/C, Nota de Crédito...) →
   determina si pide `relatedVoucherId` (RN-VOU-08: la NC lo exige) y si
   afecta stock.
2. Elegir **contraparte** (cliente si es venta, proveedor si es compra) —
   el tipo de comprobante ya fijó el flujo, el combobox solo muestra la
   lista correspondiente.
3. Si afecta stock, elegir **depósito** (obligatorio recién en este punto
   — RN-VOU-07 solo lo exige si alguna línea trackea stock, así que no se
   pide de entrada para no interrumpir con un campo que a veces no hace
   falta).
4. **Líneas**: cada fila = ítem (combobox con búsqueda) + cantidad +
   precio (autocompletado desde la lista de precios de la empresa si
   existe, editable) + descuento. Subtotal, impuestos y total se
   recalculan en vivo, línea por línea y en el total — mismo cálculo que
   `CreateVoucherUseCase`, corrido en el cliente solo para mostrar en
   vivo, **nunca enviado al backend como el valor final** (RN-VOU-09: el
   total lo calcula el backend, siempre).
5. Confirmar: la creación es **atómica e inmutable** (RN-VOU-03) — la UI
   lo comunica explícitamente ("Confirmar Factura" en vez de "Guardar
   borrador"; no existe estado de borrador en el backend).

### 3.2 Registro de Cobro/Pago

1. Elegir contraparte y sentido (cobro/pago) → determina qué
   comprobantes pendientes de esa contraparte se muestran para imputar.
2. Elegir uno o más **comprobantes a imputar** (checkboxes con el saldo
   pendiente de cada uno), con el total imputado sumando en vivo.
3. Agregar uno o más **medios de pago** — cada medio agrega su detalle
   condicional (Cheque pide número/banco/vencimiento; Tarjeta pide
   código de autorización). El total de medios debe igualar el total
   imputado antes de poder confirmar (mismo balance que RN-PAY-03
   valida en el backend, anticipado en la UI).
4. Si algún medio requiere caja (Efectivo) o banco (Transferencia/
   Tarjeta), la UI pide **sesión de caja abierta** / **cuenta bancaria**
   correspondiente — si no hay una sesión abierta, ofrece abrir una ahí
   mismo en vez de mandar al usuario a buscar "Caja y Bancos" por su
   cuenta.

### 3.3 Caja: apertura, movimiento manual, cierre

Pantalla única por sesión (`caja-bancos/sesiones/[cashSessionId]`) con
tres estados visuales claros: **abierta** (permite registrar movimientos
manuales y ver los automáticos de cobros/pagos en vivo), **a cerrar**
(el usuario ingresa el efectivo contado, la UI muestra el saldo esperado
calculado y la diferencia antes de confirmar — RN-CASH-04), **cerrada**
(solo lectura, con el resumen final).

### 3.4 Activar Contabilidad y mapear cuentas

Flujo de configuración única (`configuracion/contabilidad/`), no operativo
diario: un wizard de 3 pasos — activar (clona el Plan de Cuentas
estándar), revisar/editar el Plan de Cuentas resultante, mapear las
entidades que lo requieren (categorías → cuenta de venta/compra,
impuestos → cuenta de IVA, cajas/bancos → cuenta contable). La UI marca
con una alerta no bloqueante qué categorías/impuestos todavía no tienen
mapeo, porque el backend rechazará el primer Comprobante/Cobro real que
los necesite (RN-ACC-05) — mejor avisar en configuración que en medio de
una venta.

## 4. Estados de carga, vacío y error (convención única)

- **Carga**: skeleton (placeholder gris con la forma del contenido real),
  nunca un spinner centrado que colapsa el layout — evita el salto visual
  cuando el contenido llega.
- **Vacío**: mensaje breve + la acción principal de esa pantalla (ver
  §2). Nunca una tabla con encabezados y cero filas sin explicación.
- **Error de red/servidor**: el mensaje que devuelve el backend
  (`ApiError.message`, ya en español) se muestra tal cual, con un botón
  "Reintentar" que vuelve a disparar la query de TanStack Query — nunca
  un mensaje genérico tipo "Algo salió mal" que oculta información útil
  que el backend ya calculó.
- **Confirmación de acciones irreversibles**: activar/desactivar pide
  confirmación (`ConfirmDialog`); crear un Comprobante/Pago/Asiento
  **no** pide un segundo diálogo de confirmación además del propio botón
  de enviar — doble confirmación para todo entrena a los usuarios a
  aceptar sin leer.

## 5. Accesibilidad y atajos de teclado

- Todo formulario navegable por teclado sin mouse (heredado de Radix vía
  shadcn/ui, ver `00-arquitectura-frontend.md` §5).
- `Cmd/Ctrl+K` abre un buscador global (combobox de comando) para saltar
  directo a un cliente/proveedor/comprobante por nombre o número — no es
  parte del alcance de MVP de frontend, se deja anotado acá como mejora
  de Sprint F8+ (ver plan de sprints) porque cambia la percepción de
  "profesional" de la herramienta con relativamente poco esfuerzo.

## 6. Responsividad

Uso previsto es de escritorio (back-office administrativo, no una app de
punto de venta para tablet/celular en esta etapa). El layout se adapta a
tablet (sidebar colapsable a íconos) pero no se optimiza para teléfono en
el MVP de frontend — las tablas de este dominio (líneas de comprobante,
Libro Mayor) no son usables en una pantalla angosta sin un rediseño
específico que no está en el alcance actual. Se deja como decisión
explícita, no como omisión.
