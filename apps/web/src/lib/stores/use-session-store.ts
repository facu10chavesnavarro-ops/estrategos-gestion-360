import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

// Forma real que devuelve GET /me/companies. Debería reemplazarse por
// Schemas['CompanyEntity'] de @estrategos/shared-types una vez resuelto el
// gap de introspección de entidades de dominio en el CLI plugin de
// @nestjs/swagger (hoy ese schema llega vacío en el OpenAPI generado).
export interface SessionCompany {
  id: string;
  legalName: string;
  taxId: string | null;
  isActive: boolean;
}

export interface SessionMembership {
  companyId: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
}

interface SessionState {
  user: SessionUser | null;
  companies: SessionCompany[] | null;
  membership: SessionMembership | null;
  /** companyId para el que `membership` ya fue resuelto contra GET /auth/me
   * (incluso si el resultado fue `null`, es decir "no es miembro"). Permite
   * distinguir "todavía no se sabe" de "se confirmó que no hay membresía". */
  membershipCompanyId: string | null;
  setSession: (user: SessionUser, companies: SessionCompany[]) => void;
  /**
   * Rehidrata la sesión desde GET /auth/me — ver addendum "GET /auth/me" en
   * docs/frontend/04-sprint-f1-configuracion.md. El backend es la única
   * fuente de verdad para usuario y permisos: esto se llama al montar cada
   * `[companyId]/layout.tsx`, incluyendo tras un F5.
   */
  setCurrentUser: (
    user: SessionUser,
    membership: SessionMembership | null,
    companyId: string,
  ) => void;
  clearSession: () => void;
}

/**
 * Sesión del usuario autenticado: se carga una vez tras el login (o al
 * hidratar la app si ya había una cookie válida) y no se vuelve a pedir en
 * cada navegación — ver 01-organizacion-y-estado.md §4. No persiste en
 * localStorage: si se recarga la página, se vuelve a resolver contra el
 * BFF (la fuente de verdad es la cookie httpOnly, no este store).
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  companies: null,
  membership: null,
  membershipCompanyId: null,
  setSession: (user, companies) =>
    set({ user, companies, membership: null, membershipCompanyId: null }),
  setCurrentUser: (user, membership, companyId) =>
    set({ user, membership, membershipCompanyId: companyId }),
  clearSession: () =>
    set({ user: null, companies: null, membership: null, membershipCompanyId: null }),
}));
