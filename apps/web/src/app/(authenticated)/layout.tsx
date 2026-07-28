import { redirect } from 'next/navigation';
import { getRefreshToken } from '@/lib/auth/cookies';

/**
 * Guarda toda la zona autenticada (seleccionar-empresa + [companyId]/...):
 * se chequea el refresh token (30 días), no el access token (15 min) — un
 * access token vencido no debe expulsar a alguien con sesión válida, ese
 * caso ya lo resuelve la renovación transparente del proxy de
 * /api/backend/* en la primera llamada que haga la página.
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  if (!getRefreshToken()) {
    redirect('/login');
  }

  return <>{children}</>;
}
