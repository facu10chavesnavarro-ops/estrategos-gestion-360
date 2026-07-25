import { randomBytes } from 'crypto';

/**
 * Genera un UUID v7 (RFC 9562): 48 bits de timestamp Unix en ms + el resto
 * aleatorio, ordenable temporalmente. Se implementa sin dependencias nuevas
 * (ver docs/sprint-3/02-depositos-y-stock.md §0.3) — Prisma 5.20 solo genera
 * v4 nativamente, y esta función tiene ~15 líneas bien especificadas por el
 * RFC, no justifica sumar una librería.
 *
 * Uso: exclusivo de tablas de alto volumen (`StockMovement` y las que
 * sigan en Sprint 3.3+) — el resto del sistema sigue con UUID v4
 * (`@default(uuid())` de Prisma), ver Decisión 1.1 del documento de
 * arquitectura del núcleo financiero.
 */
export function uuidv7(): string {
  const unixTsMs = BigInt(Date.now());
  const bytes = Buffer.alloc(16);

  bytes[0] = Number((unixTsMs >> 40n) & 0xffn);
  bytes[1] = Number((unixTsMs >> 32n) & 0xffn);
  bytes[2] = Number((unixTsMs >> 24n) & 0xffn);
  bytes[3] = Number((unixTsMs >> 16n) & 0xffn);
  bytes[4] = Number((unixTsMs >> 8n) & 0xffn);
  bytes[5] = Number(unixTsMs & 0xffn);

  const rand = randomBytes(10);
  rand.copy(bytes, 6);

  bytes[6] = (bytes[6] & 0x0f) | 0x70; // versión 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 9562

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
