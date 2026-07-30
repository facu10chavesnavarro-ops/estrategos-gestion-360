import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Los campos opcionales de un formulario RHF quedan en `''` cuando el
 * usuario los deja en blanco, pero `class-validator` en el backend solo
 * trata `undefined`/`null` como "no informado" — un `@IsOptional()
 * @IsEmail()` rechaza `''` como formato inválido. Se limpia antes de
 * enviar en vez de relajar la validación del backend.
 */
export function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '')) as Partial<T>
}
