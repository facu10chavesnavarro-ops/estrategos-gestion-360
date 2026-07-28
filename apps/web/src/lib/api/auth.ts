import { ApiError, apiFetch } from './http-client';
import type { SessionCompany, SessionUser } from '../stores/use-session-store';

/**
 * Login/logout/sesión no pasan por TanStack Query (ver 01-organizacion-y-
 * estado.md §3): son llamadas puntuales contra las rutas de /api/auth/*
 * del propio BFF (no contra /api/backend/*), porque ahí es donde viven las
 * cookies httpOnly de sesión — no hay nada que cachear como "datos de
 * servidor" en el sentido de TanStack Query.
 */

export async function login(email: string, password: string): Promise<{ user: SessionUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      typeof body.message === 'string' ? body.message : 'No se pudo iniciar sesión',
      res.status,
    );
  }

  return body as { user: SessionUser };
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
}

export async function fetchSession(): Promise<{ authenticated: boolean }> {
  const res = await fetch('/api/auth/session');
  return res.json();
}

export async function fetchMyCompanies(): Promise<SessionCompany[]> {
  return apiFetch<SessionCompany[]>('me/companies', '');
}
