import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth/cookies';

// Chequeo liviano de "¿hay una sesión iniciada?" para el bootstrap del
// cliente (useSessionStore) — no valida el JWT contra el backend, solo la
// presencia de la cookie. La autoridad real sigue siendo cada respuesta
// 401 del backend a través de /api/backend/*.
export async function GET() {
  return NextResponse.json({ authenticated: Boolean(await getAccessToken()) });
}
