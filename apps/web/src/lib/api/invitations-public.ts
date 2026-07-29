import { apiFetch, ApiError } from './http-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface InvitationPreview {
  companyName: string;
  roleName: string;
  email: string;
  status: InvitationStatus;
}

/**
 * Solo para Server Components: llamada directa al backend, sin pasar
 * por /api/backend/* — es un endpoint público (sin sesión, sin
 * X-Company-Id) y esto corre en el servidor de Next, no en el navegador,
 * así que no hay CORS ni cookies que forwardear (ver
 * docs/frontend/04-sprint-f1-configuracion.md §4.4).
 */
export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  const res = await fetch(`${API_URL}/api/v1/invitations/${token}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      typeof body.message === 'string' ? body.message : 'No se pudo cargar la invitación',
      res.status,
    );
  }

  return body as InvitationPreview;
}

export interface AcceptInvitationInput {
  fullName: string;
  password: string;
}

export interface AcceptInvitationOutput {
  userId: string;
  companyId: string;
}

/**
 * Client-side: pasa por /api/backend/* como el resto de la app. apiFetch
 * no agrega Authorization si no hay cookie de sesión — inofensivo para
 * un endpoint público.
 */
export async function acceptInvitation(
  token: string,
  input: AcceptInvitationInput,
): Promise<AcceptInvitationOutput> {
  return apiFetch(`invitations/${token}/accept`, '', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
