import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from './http-client';
import { queryKeys } from './query-keys';
import {
  useSessionStore,
  type SessionMembership,
  type SessionUser,
} from '../stores/use-session-store';

/**
 * Login/logout/chequeo de cookie no pasan por TanStack Query (ver
 * 01-organizacion-y-estado.md §3): son llamadas puntuales contra las rutas
 * de /api/auth/* del propio BFF (no contra /api/backend/*), porque ahí es
 * donde viven las cookies httpOnly de sesión — no hay nada que cachear como
 * "datos de servidor" en el sentido de TanStack Query.
 *
 * GET /auth/me es distinto: es un dato de servidor cacheable (identidad +
 * membresía en la empresa activa), por eso sí usa useQuery — ver
 * useCurrentUser más abajo y el addendum "GET /auth/me" en
 * docs/frontend/04-sprint-f1-configuracion.md.
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

/**
 * Cierra sesión y limpia todo rastro client-side: el store de sesión y la
 * caché de TanStack Query (para que un próximo login no arranque mostrando
 * datos en caché de la empresa/usuario anterior).
 */
export function useLogout() {
  const router = useRouter();
  const clearSession = useSessionStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return async () => {
    await logout();
    clearSession();
    queryClient.clear();
    router.push('/login');
  };
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  membership: SessionMembership | null;
}

/**
 * GET /auth/me: identidad del usuario autenticado + su membresía (rol,
 * estado) en `companyId`, resueltas por el backend a partir del JWT y de
 * X-Company-Id. Es la fuente de verdad que reemplaza cualquier lookup
 * client-side para reconstruir la sesión tras un F5 (ver addendum
 * "GET /auth/me" en docs/frontend/04-sprint-f1-configuracion.md).
 */
export function useCurrentUser(companyId: string) {
  return useQuery({
    queryKey: queryKeys.auth.me(companyId),
    queryFn: () => apiFetch<CurrentUser>('auth/me', companyId),
    enabled: Boolean(companyId),
  });
}
