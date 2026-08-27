import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/auth/cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (typeof body?.email !== 'string' || typeof body?.password !== 'string') {
    return NextResponse.json(
      { message: 'Correo y contraseña son obligatorios' },
      { status: 400 },
    );
  }

  const backendRes = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  const data = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    return NextResponse.json(
      {
        message:
          typeof data.message === 'string' ? data.message : 'No se pudo iniciar sesión',
      },
      { status: backendRes.status },
    );
  }

  // El JWT nunca llega al navegador: solo queda en cookies httpOnly.
  await setSessionCookies(data.accessToken, data.refreshToken);
  return NextResponse.json({ user: data.user });
}
