import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, getRefreshToken } from '@/lib/auth/cookies';
import { assertSameOrigin } from '@/lib/auth/csrf';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    // Best-effort: el backend siempre responde 200 (ver auth.controller.ts),
    // y si la red falla igual cerramos la sesión localmente — "cerrar
    // sesión" no es una operación que deba poder fallar para quien la pide.
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  await clearSessionCookies();
  return NextResponse.json({ success: true });
}
