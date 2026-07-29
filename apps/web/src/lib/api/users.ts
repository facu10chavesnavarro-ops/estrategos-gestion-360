import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http-client';
import { queryKeys } from './query-keys';
import { useSessionStore } from '../stores/use-session-store';

export interface Member {
  userId: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
}

export function useMembers(companyId: string) {
  return useQuery({
    queryKey: queryKeys.users.members(companyId),
    queryFn: () => apiFetch<Member[]>(`companies/${companyId}/members`, companyId),
    enabled: Boolean(companyId),
  });
}

/**
 * Rol propio en la empresa activa. Se lee directamente de useSessionStore,
 * hidratado por AppShell desde GET /auth/me (ver addendum "GET /auth/me",
 * docs/frontend/04-sprint-f1-configuracion.md) — el backend es la única
 * fuente de verdad, incluso tras un F5. `isLoading` es true hasta que la
 * membresía se resuelve para este companyId puntual (fail-closed: mientras
 * no se sepa el rol propio, no se ofrecen controles de administración).
 */
export function useCurrentMembership(companyId: string) {
  const membership = useSessionStore((state) => state.membership);
  const membershipCompanyId = useSessionStore((state) => state.membershipCompanyId);
  const isLoading = membershipCompanyId !== companyId;
  return { membership: isLoading ? undefined : (membership ?? undefined), isLoading };
}

export function useChangeMemberRole(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      apiFetch<{ success: true }>(`companies/${companyId}/members/${userId}/role`, companyId, {
        method: 'PATCH',
        body: JSON.stringify({ roleId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.members(companyId) });
    },
  });
}

function useMemberStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ success: true }>(
        `companies/${companyId}/members/${userId}/${action}`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.members(companyId) });
    },
  });
}

export function useActivateMember(companyId: string) {
  return useMemberStatusMutation(companyId, 'activate');
}

export function useDeactivateMember(companyId: string) {
  return useMemberStatusMutation(companyId, 'deactivate');
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export function useInvitations(companyId: string) {
  return useQuery({
    queryKey: queryKeys.users.invitations(companyId),
    queryFn: () => apiFetch<Invitation[]>(`companies/${companyId}/invitations`, companyId),
    enabled: Boolean(companyId),
  });
}

export interface CreateInvitationInput {
  email: string;
  roleId: string;
}

export interface CreateInvitationOutput {
  id: string;
  email: string;
  roleId: string;
  expiresAt: string;
  token: string;
}

export function useCreateInvitation(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiFetch<CreateInvitationOutput>(`companies/${companyId}/invitations`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations(companyId) });
    },
  });
}

export function useRevokeInvitation(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<{ success: true }>(
        `companies/${companyId}/invitations/${invitationId}/revoke`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations(companyId) });
    },
  });
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.users.roles(),
    queryFn: () => apiFetch<Role[]>('roles', ''),
    staleTime: 5 * 60_000, // catálogo global, cambia poco
  });
}

/** Mismo set que valida el backend (ROLES_THAT_CAN_MANAGE_COMPANY). */
export const ROLES_THAT_CAN_MANAGE_COMPANY = [
  'Administrador Estrategos',
  'Propietario',
  'Administrador de empresa',
];
