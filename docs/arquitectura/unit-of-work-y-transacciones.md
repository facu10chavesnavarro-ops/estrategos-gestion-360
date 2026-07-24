# Unit of Work y transacciones de base de datos

Resuelve el Hallazgo Crítico H1 de `docs/AUDITORIA-TECNICA-PRE-SPRINT-3.md`.
Decisión tomada por el usuario: implementar Unit of Work usando
`prisma.$transaction` como mecanismo de ejecución, como patrón único y
reutilizable para todos los módulos futuros (Ventas, Compras, Tesorería,
Inventario, Contabilidad).

## 1. Problema

Los casos de uso que escriben en más de una tabla lo hacían con llamadas a
Prisma completamente independientes. Esto no es solo "crear una empresa y
después su membresía": **toda acción que además escribe en `AuditLog`** (que
es prácticamente todo el sistema, por RN-009) ya es una operación
multi-tabla. Sin atomicidad, una falla a mitad de camino deja:

- Una entidad creada/modificada **sin su registro de auditoría** — en un
  ERP, una acción sensible sin rastro de auditoría es en sí misma un defecto
  de cumplimiento, no un detalle técnico.
- O peor: una entidad "padre" sin su entidad relacionada (`Company` sin
  `CompanyUser`, `Party` sin `Customer`/`Supplier`), dejando un registro
  inaccesible o incompleto que alguien tiene que diagnosticar a mano.

## 2. Diseño elegido

### 2.1 Por qué un `TransactionContext` opaco, no el tipo de Prisma directo

La restricción dura del proyecto (`docs/ARQUITECTURA.md` sección 2): `domain/`
nunca importa nada de Prisma. Si los métodos de los repositorios (definidos
como puertos en `domain/repositories/`) aceptaran un
`Prisma.TransactionClient` como parámetro, el dominio pasaría a depender de
Prisma indirectamente a través de ese tipo — se rompería la regla para
ahorrarse una capa de indirección.

En cambio, se define un tipo opaco sin ninguna forma conocida:

```ts
// common/domain/transaction/transaction-context.ts
declare const TRANSACTION_CONTEXT_BRAND: unique symbol;
export interface TransactionContext {
  readonly [TRANSACTION_CONTEXT_BRAND]: never;
}
```

El dominio solo sabe que existe "un contexto de transacción" que se puede
recibir y volver a pasar — no sabe ni le importa qué hay adentro. Solo la
capa de infraestructura (los repositorios Prisma concretos) sabe que, en
runtime, ese objeto **es** un `Prisma.TransactionClient`, y lo *castea* de
vuelta ahí — nunca en `domain/` ni en `application/`.

### 2.2 Por qué no `AsyncLocalStorage` (alternativa A1 del informe de auditoría)

El informe de auditoría había propuesto `AsyncLocalStorage` como opción
recomendada inicial, por ser transparente (los repositorios no cambian de
firma). Se reconsideró al diseñar en detalle: `AsyncLocalStorage` mueve la
propagación de la transacción a un canal implícito — un desarrollador
leyendo un caso de uso nuevo no ve en ningún lado que sus llamadas a
repositorios están (o no) dentro de una transacción, tiene que saber que
existe la ALS para entenderlo. Con un parámetro `ctx?` explícito, **se lee
directamente en la firma del método y en el call site** — más verboso, pero
consistente con el resto del proyecto, que siempre prioriza explícito por
sobre implícito (ver, por ejemplo, por qué se prefirió un helper local a
"magia" de decoradores en Sprint 1). Se prioriza claridad sobre brevedad.

### 2.3 Piezas

```
common/domain/transaction/
  transaction-context.ts   — tipo opaco
  unit-of-work.port.ts     — abstract class UnitOfWork { run<T>(fn): Promise<T> }

common/infrastructure/persistence/
  prisma-unit-of-work.ts   — implementa UnitOfWork con prisma.$transaction
  resolve-client.ts        — helper: (prisma, ctx?) => cliente a usar
```

```ts
// unit-of-work.port.ts
export abstract class UnitOfWork {
  abstract run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}

// prisma-unit-of-work.ts
@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly prisma: PrismaService) { super(); }

  run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) =>
      fn(tx as unknown as TransactionContext),
    );
  }
}

// resolve-client.ts
export function resolveClient(prisma: PrismaService, ctx?: TransactionContext) {
  return ctx ? (ctx as unknown as Prisma.TransactionClient) : prisma;
}
```

Cada método de cada repositorio gana un último parámetro opcional `ctx?:
TransactionContext`, y usa `resolveClient(this.prisma, ctx)` en vez de
`this.prisma` directamente para la llamada a Prisma. Si no se pasa `ctx`
(caso de uso de una sola escritura, o un test que no necesita transacción),
el repositorio sigue funcionando exactamente igual que antes — **este
cambio es aditivo, no rompe ningún caso de uso que no se toque**.

### 2.4 Cómo lo usa un caso de uso multi-escritura

```ts
async execute(input: CreateCustomerUseCaseInput): Promise<CustomerEntity> {
  assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);
  // ...validaciones que no tocan la base de datos, fuera de la transacción...

  return this.unitOfWork.run(async (ctx) => {
    const partyId = await this.resolvePartyId(input, ctx); // create o reuse, con ctx
    const customer = await this.customerRepository.create({ partyId, ... }, ctx);
    await this.auditLogRepository.record({ action: 'customer.create', ... }, ctx);
    return customer;
  });
}
```

Si `auditLogRepository.record` falla, Postgres revierte también la creación
del `Party`/`Customer` — no queda nada a medio camino.

### 2.5 Importaciones CSV: una transacción por fila, no una para todo el archivo

RN-TER-10 exige procesamiento *best-effort* por fila (una fila inválida no
aborta las demás). Envolver el archivo COMPLETO en una única transacción
rompería esa regla de negocio (cualquier fila que fallara revertiría también
las que ya habían tenido éxito). La unidad de atomicidad correcta es **la
fila**, no el archivo: `CustomerImportRowProcessor.create()`/`applyUpdate()`
reciben su propio `ctx` de una transacción abierta *por fila* dentro del
motor de importación, no una transacción compartida por todo el `run()`.

## 3. Qué se refactorizó

Todo caso de uso que escribe en más de una tabla (contando `AuditLog` como
una tabla más, porque lo es):

**Empresas**: `CreateCompanyUseCase`, `UpdateCompanyUseCase`,
`DeactivateCompanyUseCase`, `ActivateCompanyUseCase`, `CreateBranchUseCase`,
`UpdateBranchUseCase`, `DeactivateBranchUseCase`, `ActivateBranchUseCase`.

**Usuarios**: `CreateInvitationUseCase`, `RevokeInvitationUseCase`,
`AcceptInvitationUseCase`, `ChangeMemberRoleUseCase`,
`DeactivateMemberUseCase`, `ActivateMemberUseCase`.

**Clientes**: `CreateCustomerUseCase`, `UpdateCustomerUseCase`,
`DeactivateCustomerUseCase`, `ActivateCustomerUseCase`, y el procesador de
importación (transacción por fila).

**Proveedores**: los mismos cinco, espejados.

No se tocó: casos de uso de solo lectura (`Get*ByIdUseCase`,
`List*UseCase`) — no escriben nada, no hay nada que hacer atómico.

## 4. Estrategia de pruebas

1. **Unitarias** (actualizadas, no nuevas en su mayoría): cada spec ahora
   mockea `UnitOfWork.run` como `(fn) => fn(fakeCtx)` — ejecuta el callback
   inmediatamente con un contexto falso, para poder seguir probando la
   lógica de negocio sin una base de datos real. Se verifica además que cada
   repositorio se llama con ese `ctx`.
2. **Integración (nueva infraestructura)**: base de datos de test dedicada
   (`estrategos_test`), casos de uso reales conectados a repositorios Prisma
   reales (sin mocks), verificando con una falla forzada en un colaborador
   (ej. el repositorio de auditoría) que **no queda ningún registro
   huérfano** — se consulta la base directamente después del rollback
   esperado.
3. **End-to-end**: verificación manual con `curl` de que los flujos
   refactorizados siguen funcionando idénticamente para el camino feliz
   (regresión). Forzar una falla real a mitad de una transacción desde
   afuera del proceso (por HTTP) no es demostrable sin instrumentar un gancho
   de fallas específico para pruebas — no se simula ni se inventa esa
   evidencia; la prueba de rollback real vive en la capa de integración,
   donde sí se puede forzar de forma controlada y verificable.
