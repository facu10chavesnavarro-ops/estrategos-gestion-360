import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PointsOfSaleTable } from './points-of-sale-table';
import * as pointOfSaleApi from '@/lib/api/vouchers/point-of-sale';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/c1/comprobantes/puntos-de-venta',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/vouchers/point-of-sale', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/vouchers/point-of-sale')>(
    '@/lib/api/vouchers/point-of-sale',
  );
  return {
    ...actual,
    useActivatePointOfSale: vi.fn(),
    useDeactivatePointOfSale: vi.fn(),
  };
});

const POINT_OF_SALE: pointOfSaleApi.PointOfSaleWithBranch = {
  id: 'pos-1',
  companyId: 'c1',
  branchId: 'branch-1',
  code: '0001',
  name: 'Casa Central',
  isActive: true,
  branchName: 'Sucursal Principal',
};

const deactivateMutateAsync = vi.fn().mockResolvedValue({ ...POINT_OF_SALE, isActive: false });

beforeEach(() => {
  vi.mocked(pointOfSaleApi.useActivatePointOfSale).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(pointOfSaleApi.useDeactivatePointOfSale).mockReturnValue({
    mutateAsync: deactivateMutateAsync,
  } as any);
});

describe('PointsOfSaleTable', () => {
  it('sin permisos de gestión: no muestra "Editar"/"Desactivar" en las filas', () => {
    render(
      <PointsOfSaleTable
        companyId="c1"
        pointsOfSale={[POINT_OF_SALE]}
        canManage={false}
        onEdit={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    expect(within(table).queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(within(table).queryByRole('button', { name: 'Desactivar' })).toBeNull();
  });

  it('con permisos de gestión: permite desactivar tras confirmar', async () => {
    const user = userEvent.setup();
    render(
      <PointsOfSaleTable
        companyId="c1"
        pointsOfSale={[POINT_OF_SALE]}
        canManage={true}
        onEdit={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    await user.click(within(table).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('¿Confirmás desactivar "Casa Central"?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(deactivateMutateAsync).toHaveBeenCalledWith({ branchId: 'branch-1', pointOfSaleId: 'pos-1' }),
    );
  });

  it('muestra el código y el nombre del punto de venta', () => {
    render(
      <PointsOfSaleTable
        companyId="c1"
        pointsOfSale={[POINT_OF_SALE]}
        canManage={false}
        onEdit={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    expect(within(table).getByText('0001')).toBeInTheDocument();
    expect(within(table).getByText('Casa Central')).toBeInTheDocument();
  });
});
