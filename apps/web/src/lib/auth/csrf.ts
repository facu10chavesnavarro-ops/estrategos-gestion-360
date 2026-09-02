import { NextRequest, NextResponse } from 'next/server';

/**
 * Auditoría de seguridad (hallazgo Medio #3): defensa CSRF explícita además
 * de `SameSite=lax` en las cookies de sesión (ver cookies.ts). `SameSite=lax`
 * ya bloquea el envío de la cookie en un POST cross-site en navegadores
 * modernos, pero es la única capa hasta ahora — esto agrega una segunda,
 * independiente de que el navegador honre SameSite correctamente.
 *
 * Verificación de origen: el spec de Fetch exige que el navegador mande el
 * header `Origin` en cualquier request "unsafe" (POST/PUT/PATCH/DELETE),
 * sea same-origin o cross-origin — a diferencia de un <form> HTML clásico,
 * un atacante no puede falsificarlo ni omitirlo desde JS. Comparamos ese
 * Origin contra el origin real de ESTE request (derivado del header Host
 * que Next.js ya resuelve en `request.nextUrl.origin`) — no hace falta una
 * lista de orígenes permitidos ni una env var nueva: la única fuente
 * legítima de estos endpoints es el propio frontend, sirviéndose a sí
 * mismo.
 *
 * Devuelve una respuesta 403 si el chequeo falla, o `null` si pasa (el
 * caller sigue con su lógica normal).
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');

  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { message: 'Origen de la solicitud no permitido' },
      { status: 403 },
    );
  }

  return null;
}
