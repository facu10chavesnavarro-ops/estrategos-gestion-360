import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WarehousesTable } from './warehouses-table';
import * as warehousesApi from '@/lib/api/inventory/warehouses';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/c1/stock/depositos',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/inventory/warehouses', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inventory/warehouses')>(
    '@/lib/api/inventory/warehouses',
  );
  return {
    ...actual,
    useActivateWarehouse: vi.fn(),
    useDeactivateWarehouse: vi.fn(),
  };
});

const WAREHOUSE: warehousesApi.WarehouseWithBranch = {
  id: 'wh-1',
  companyId: 'c1',
  branchId: 'branch-1',
  name: 'Depósito Central',
  isActive: true,
  branchName: 'Sucursal Principal',
};

const deactivateMutateAsync = vi.fn().mockResolvedValue({ ...WAREHOUSE, isActive: false });

beforeEach(() => {
  vi.mocked(warehousesApi.useActivateWarehouse).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(warehousesApi.useDeactivateWarehouse).mockReturnValue({
    mutateAsync: deactivateMutateAsync,
  } as any);
});

describe('WarehousesTable', () => {
  it('sin permisos de gestión: no muestra "Editar"/"Desactivar" en las filas', () => {
    render(
      <WarehousesTable companyId="c1" warehouses={[WAREHOUSE]} canManage={false} onEdit={vi.fn()} />,
    );

    const table = screen.getByRole('table');
    expect(within(table).queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(within(table).queryByRole('button', { name: 'Desactivar' })).toBeNull();
  });

  it('con permisos de gestión: permite desactivar tras confirmar', async () => {
    const user = userEvent.setup();
    render(
      <WarehousesTable companyId="c1" warehouses={[WAREHOUSE]} canManage={true} onEdit={vi.fn()} />,
    );

    const table = screen.getByRole('table');
    await user.click(within(table).getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByText('¿Confirmás desactivar "Depósito Central"?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(deactivateMutateAsync).toHaveBeenCalledWith({ branchId: 'branch-1', warehouseId: 'wh-1' }),
    );
  });

  it('el nombre del depósito enlaza a su detalle', () => {
    render(
      <WarehousesTable companyId="c1" warehouses={[WAREHOUSE]} canManage={false} onEdit={vi.fn()} />,
    );

    const table = screen.getByRole('table');
    const link = within(table).getByRole('link', { name: 'Depósito Central' });
    expect(link).toHaveAttribute('href', '/c1/stock/depositos/wh-1');
  });
});
