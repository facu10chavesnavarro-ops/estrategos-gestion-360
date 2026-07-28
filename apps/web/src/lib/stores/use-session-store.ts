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

interface SessionState {
  user: SessionUser | null;
  companies: SessionCompany[] | null;
  setSession: (user: SessionUser, companies: SessionCompany[]) => void;
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
  setSession: (user, companies) => set({ user, companies }),
  clearSession: () => set({ user: null, companies: null }),
}));
