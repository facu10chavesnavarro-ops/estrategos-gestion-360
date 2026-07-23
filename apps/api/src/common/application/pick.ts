/** Arma un objeto solo con las claves de `obj` cuyo valor no es `undefined`. */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
