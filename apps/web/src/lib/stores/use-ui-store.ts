import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

/**
 * Preferencias de UI que sobreviven a la navegación (y a recargar la
 * página, a diferencia de useSessionStore) — ver 01-organizacion-y-
 * estado.md §4. No es información del backend ni de la sesión, así que
 * persistir en localStorage acá no tiene el riesgo de desincronizarse con
 * una fuente de verdad del servidor.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'eg_ui_prefs' },
  ),
);
