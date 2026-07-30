/**
 * El `ValidationPipe` global de Nest devuelve `message` como un array de
 * strings cuando falla más de una regla de `class-validator` a la vez
 * (ej. dejar "Correo" con un valor no vacío inválido y "Días de pago"
 * fuera de rango en el mismo submit) — sin este join, esos casos caían al
 * genérico "Ocurrió un error inesperado" en vez de mostrar el motivo real.
 */
function extractMessage(message: unknown): string {
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
    return message.join(' ');
  }
  return 'Ocurrió un error inesperado';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

/**
 * Unico punto de entrada a la API para el codigo de UI: siempre pasa por
 * /api/backend/* (el BFF, ver src/app/api/backend/[...path]/route.ts), que
 * inyecta el Authorization header desde la cookie httpOnly y renueva la
 * sesion de forma transparente si el access token expiro — el llamador
 * nunca ve un 401 por expiracion, solo por credenciales realmente invalidas.
 *
 * companyId es obligatorio para reflejar que casi todo endpoint de negocio
 * exige X-Company-Id (ver CompanyContextGuard); para los pocos que no lo
 * requieren (ej. GET /me/companies antes de elegir empresa) se pasa ''.
 */
export async function apiFetch<T>(
  path: string,
  companyId: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(companyId ? { 'X-Company-Id': companyId } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`/api/backend/${path.replace(/^\//, '')}`, {
    ...init,
    headers,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(
      extractMessage(body?.message),
      res.status,
      typeof body?.code === 'string' ? body.code : undefined,
    );
  }

  return body as T;
}
