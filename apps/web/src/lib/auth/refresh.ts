import { clearSessionCookies, getRefreshToken, setSessionCookies } from './cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Rota access + refresh token contra el backend (POST /auth/refresh revoca
 * el refresh token usado y emite uno nuevo, ver refresh-session.use-case.ts)
 * y actualiza ambas cookies httpOnly. Usado tanto por /api/auth/refresh
 * (llamada explícita) como por el proxy de /api/backend/* (renovación
 * transparente ante un 401).
 */
export async function refreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearSessionCookies();
    return false;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  await setSessionCookies(data.accessToken, data.refreshToken);
  return true;
}
