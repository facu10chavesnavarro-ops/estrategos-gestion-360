import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MembersTable } from './members-table';
import { useSessionStore } from '@/lib/stores/use-session-store';
import * as usersApi from '@/lib/api/users';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/c1/configuracion/usuarios',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/users', () => ({
  useMembers: vi.fn(),
  useRoles: vi.fn(),
  useChangeMemberRole: vi.fn(),
  useActivateMember: vi.fn(),
  useDeactivateMember: vi.fn(),
}));

const SELF: usersApi.Member = {
  userId: 'u1',
  email: 'admin@estrategos.local',
  fullName: 'Admin',
  roleId: 'r1',
  roleName: 'Administrador Estrategos',
  isActive: true,
};

const OTHER: usersApi.Member = {
  userId: 'u2',
  email: 'empleado@estrategos.local',
  fullName: 'Empleado',
  roleId: 'r2',
  roleName: 'Empleado',
  isActive: true,
};

const deactivateMutateAsync = vi.fn().mockResolvedValue({ success: true });

beforeEach(() => {
  vi.mocked(usersApi.useMembers).mockReturnValue({
    data: [SELF, OTHER],
    isLoading: false,
    isError: false,
  } as any);
  vi.mocked(usersApi.useRoles).mockReturnValue({ data: [] } as any);
  vi.mocked(usersApi.useChangeMemberRole).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(usersApi.useActivateMember).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(usersApi.useDeactivateMember).mockReturnValue({
    mutateAsync: deactivateMutateAsync,
  } as any);
  useSessionStore.getState().clearSession();
  useSessionStore.getState().setCurrentUser(
    { id: 'u1', email: 'admin@estrategos.local', fullName: 'Admin' },
    { companyId: 'c1', roleId: 'r1', roleName: 'Administrador Estrategos', isActive: true },
    'c1',
  );
});

describe('MembersTable', () => {
  it('no ofrece acciones sobre la propia fila (RN-USR-12)', () => {
    render(<MembersTable companyId="c1" />);

    // Solo se verifica la tabla de escritorio: la vista móvil renderiza los
    // mismos datos en tarjetas (oculto por CSS, no por el DOM) y duplicaría
    // los matches de texto.
    const table = screen.getByRole('table');
    const selfRow = within(table).getByText('Admin').closest('tr')!;
    expect(selfRow).toHaveTextContent('(vos)');
    expect(selfRow).toHaveTextContent('Administrador Estrategos');
    expect(selfRow.querySelector('button')).toBeNull();
  });

  it('permite desactivar el acceso de otro miembro tras confirmar', async () => {
    const user = userEvent.setup();
    render(<MembersTable companyId="c1" />);

    const table = screen.getByRole('table');
    const otherRow = within(table).getByText('Empleado').closest('tr')!;
    await user.click(within(otherRow).getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByText('¿Confirmás desactivar el acceso de "Empleado"?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(deactivateMutateAsync).toHaveBeenCalledWith('u2'));
  });
});
