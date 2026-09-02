# Checklist de UAT — Estrategos Gestión 360

Casos de prueba funcionales por módulo, en el orden de los sprints F0-F8.
Pensado para probar contra staging con los datos del seed de demo (ver
[`staging-setup.md`](staging-setup.md) sección 4): usuario
`admin@estrategos.local` / `CambiarEsta123!`, "Empresa Piloto SRL" con 3
clientes, 1 proveedor, 3 ítems y 2 comprobantes ya cargados.

**Cómo usar esta planilla**: para cada caso, seguí los pasos y compará
contra el resultado esperado. Marcá **OK** o **FALLA** en la columna
correspondiente y anotá cualquier cosa rara en Observaciones, aunque no
estés seguro de que sea un bug — mejor anotarlo de más.

---

## F0 — Autenticación y sesión

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F0.1 | Login exitoso | Ir a `/login`, ingresar `admin@estrategos.local` / `CambiarEsta123!`, click Ingresar | Redirige al selector de empresa o directo a `/inicio` si solo hay una empresa | | |
| F0.2 | Login con credenciales incorrectas | Ingresar un email/contraseña inválidos | Mensaje de error claro, no dice si el usuario existe o no | | |
| F0.3 | Selector de empresa | Con el usuario logueado en más de una empresa, ir a "cambiar empresa" | Lista todas las empresas donde el usuario tiene acceso, permite cambiar | | |
| F0.4 | Logout | Click en cerrar sesión | Vuelve a `/login`; intentar volver atrás con el navegador no debe mostrar contenido protegido | | |
| F0.5 | Ruta protegida sin sesión | Con la sesión cerrada, intentar entrar directo a una URL interna (ej. `/inicio`) | Redirige a `/login`, no muestra ningún dato | | |
| F0.6 | Sesión expira y se renueva sola | Dejar la pestaña abierta e inactiva un rato largo (>15 min), después interactuar | La sesión se renueva sola sin pedir login de nuevo (o, si expiró el refresh también, pide login limpio) | | |

## F1 — Configuración (empresa, equipo, invitaciones)

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F1.1 | Ver datos de la empresa | Ir a Configuración → Empresa | Muestra razón social, CUIT y demás datos cargados | | |
| F1.2 | Editar datos de la empresa | Cambiar un campo (ej. teléfono de contacto) y guardar | Se guarda y se refleja al recargar la página | | |
| F1.3 | Ver miembros del equipo | Ir a Configuración → Usuarios | Lista al usuario admin con su rol | | |
| F1.4 | Invitar a un usuario nuevo | Cargar un email y un rol, enviar invitación | Aparece en la lista como invitación pendiente | | |
| F1.5 | Cambiar el rol de un miembro | Cambiar el rol de un usuario existente (no vos mismo) | Se actualiza y queda reflejado | | |
| F1.6 | No poder auto-modificarse | Intentar cambiar tu propio rol o desactivarte a vos mismo | La opción no está disponible o se rechaza con un mensaje claro | | |

## F2 — Clientes y Proveedores

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F2.1 | Listar clientes | Ir a Clientes | Muestra los 3 clientes del seed de demo | | |
| F2.2 | Crear un cliente nuevo | Completar el formulario de alta con razón social y CUIT | Aparece en el listado | | |
| F2.3 | Editar un cliente | Modificar el teléfono o email de un cliente existente | Se guarda correctamente | | |
| F2.4 | Desactivar un cliente | Desactivar un cliente, confirmando el motivo | Pasa a inactivo, no aparece en selectores de "cliente activo" (ej. al crear un comprobante) | | |
| F2.5 | Importar clientes/proveedores por CSV | Subir un CSV con un par de filas válidas y una inválida | Filas válidas se cargan, la inválida se reporta con el motivo, sin frenar el resto | | |
| F2.6 | Listar proveedores | Ir a Proveedores | Muestra el proveedor del seed de demo | | |

## F3 — Catálogo (productos, servicios, categorías, impuestos, listas de precio)

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F3.1 | Listar productos/servicios | Ir a Catálogo → Productos | Muestra los ítems del seed (2 productos, 1 servicio) | | |
| F3.2 | Crear un producto | Cargar SKU, nombre, unidad de medida | Aparece en el listado | | |
| F3.3 | Crear una categoría | Dar de alta una categoría nueva | Aparece en el árbol de categorías | | |
| F3.4 | Asignar categoría a un producto | Editar un producto y asignarle una categoría | Se guarda la relación | | |
| F3.5 | Crear un impuesto | Cargar un impuesto con tasa (ej. IVA 21%) | Aparece disponible para asignar a productos | | |
| F3.6 | Crear una lista de precios | Dar de alta una lista y agregar un precio para un ítem | El precio queda disponible para usarse al facturar | | |

## F4 — Stock

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F4.1 | Ver depósitos | Ir a Stock → Depósitos | Muestra el "Depósito Central" del seed | | |
| F4.2 | Crear un depósito nuevo | Dar de alta un segundo depósito | Aparece en el listado | | |
| F4.3 | Consultar stock de un producto | Ir a Stock → General, buscar un producto que trackea stock | Muestra la cantidad disponible por depósito | | |
| F4.4 | Ajuste manual de stock | Cargar un ajuste de entrada o salida sobre un producto | El stock se actualiza y el movimiento queda en el historial | | |
| F4.5 | Transferencia entre depósitos | Transferir cantidad de un depósito a otro | Baja en el origen, sube en el destino, ambos movimientos quedan registrados | | |
| F4.6 | Rechazo de operación inválida | Intentar una salida mayor al stock disponible (si la empresa no permite stock negativo) | Se rechaza con un mensaje claro, no se aplica | | |

## F5 — Comprobantes

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F5.1 | Listar comprobantes | Ir a Comprobantes | Muestra los 2 comprobantes del seed de demo (Facturas B) | | |
| F5.2 | Ver detalle de un comprobante | Abrir uno de los comprobantes del seed | Muestra cliente, líneas, totales correctos | | |
| F5.3 | Crear una factura de venta | Elegir cliente, punto de venta, agregar una línea con producto/servicio, confirmar | Se crea, aparece en el listado con numeración correlativa | | |
| F5.4 | Numeración consecutiva | Crear dos facturas seguidas en el mismo punto de venta | El número del segundo es el del primero + 1 | | |
| F5.5 | Nota de crédito sobre una factura | Desde una factura existente, generar una nota de crédito | Queda vinculada a la factura original, con signo/efecto de stock inverso | | |
| F5.6 | Rechazo de comprobante inválido | Intentar confirmar sin líneas, o con cantidad negativa | Se rechaza antes de guardar, con mensaje claro | | |
| F5.7 | Puntos de venta | Ir a Comprobantes → Puntos de venta | Muestra el punto de venta "Mostrador" (0001) del seed | | |

## F6 — Tesorería (cobros y pagos)

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F6.1 | Registrar un cobro total | Desde un comprobante de venta pendiente, cobrar el total en efectivo | El comprobante pasa a cobrado, se genera el movimiento de caja | | |
| F6.2 | Cobro parcial | Cobrar solo una parte del total | Queda un saldo pendiente visible en la cuenta corriente del cliente | | |
| F6.3 | Cobro con múltiples medios de pago | Cobrar combinando efectivo + transferencia en un mismo cobro | Se registra correctamente el desglose por medio de pago | | |
| F6.4 | Pago a proveedor | Registrar un pago sobre una compra pendiente | El comprobante de compra pasa a pagado | | |
| F6.5 | Cuenta corriente de cliente | Ver la cuenta corriente de un cliente con movimientos | Muestra el saldo correcto según cobros/facturas | | |
| F6.6 | Doble envío (idempotencia) | Enviar el mismo cobro dos veces seguidas rápido (doble click) | No se duplica el cobro | | |

## F7 — Caja y Bancos

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F7.1 | Abrir una caja | Dar de alta una caja (si no existe) y abrir una sesión con saldo inicial | Queda la sesión abierta, visible en Caja y Bancos | | |
| F7.2 | Movimiento manual de caja | Cargar un ingreso o egreso manual sobre la sesión abierta | El saldo de la caja se actualiza | | |
| F7.3 | Rechazo sin caja abierta | Intentar cargar un movimiento de caja sin ninguna sesión abierta | Se rechaza con mensaje claro | | |
| F7.4 | Cerrar sesión de caja | Cerrar la sesión abierta, con o sin diferencia de arqueo | Se cierra, muestra el saldo esperado vs. el informado | | |
| F7.5 | Rechazo de doble apertura | Intentar abrir una segunda sesión sobre la misma caja ya abierta | Se rechaza | | |
| F7.6 | Cuentas bancarias y transferencias | Dar de alta una cuenta bancaria, registrar una transferencia | Se refleja el movimiento y el saldo de la cuenta | | |

## F8 — Contabilidad

| # | Caso | Pasos | Resultado esperado | OK/FALLA | Observaciones |
|---|---|---|---|---|---|
| F8.1 | Activar contabilidad | Ir a Contabilidad → Configuración, activar el módulo para la empresa | Se clona el Plan de Cuentas estándar, quedan creadas las cuentas de control | | |
| F8.2 | Ver Plan de Cuentas | Ir a Contabilidad → Plan de Cuentas | Muestra el árbol de cuentas activado en F8.1 | | |
| F8.3 | Asiento automático de una venta | Confirmar una factura de venta con Contabilidad activa | Se genera un asiento automático, visible desde el detalle del comprobante | | |
| F8.4 | Asiento automático de un cobro | Registrar un cobro con Contabilidad activa | Se genera su propio asiento automático | | |
| F8.5 | Asiento manual | Cargar un asiento manual balanceado (débitos = créditos) | Se guarda; si no balancea, el botón de confirmar queda deshabilitado | | |
| F8.6 | Reversión de un asiento | Revertir un asiento automático | Se genera el asiento de reversión, aclara que no anula la operación de negocio original | | |
| F8.7 | Libro Diario | Ir a Contabilidad → Asientos | Lista cronológica de todos los asientos, con filtro por fecha | | |
| F8.8 | Libro Mayor de una cuenta | Entrar al detalle de una cuenta del plan | Muestra sus movimientos y saldo acumulado correcto según el tipo de cuenta | | |

---

## Resumen final

| Módulo | Casos totales | OK | FALLA | % |
|---|---|---|---|---|
| F0 — Autenticación | 6 | | | |
| F1 — Configuración | 6 | | | |
| F2 — Clientes/Proveedores | 6 | | | |
| F3 — Catálogo | 6 | | | |
| F4 — Stock | 6 | | | |
| F5 — Comprobantes | 7 | | | |
| F6 — Tesorería | 6 | | | |
| F7 — Caja y Bancos | 6 | | | |
| F8 — Contabilidad | 8 | | | |
| **Total** | **57** | | | |

**Notas generales de la ronda de UAT:**

(espacio libre para observaciones que no encajan en un caso puntual)
