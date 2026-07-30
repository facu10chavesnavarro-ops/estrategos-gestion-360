import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemsTable } from './items-table';
import * as itemsApi from '@/lib/api/catalog/items';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/c1/catalogo/productos',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/catalog/items', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/catalog/items')>(
    '@/lib/api/catalog/items',
  );
  return {
    ...actual,
    useActivateItem: vi.fn(),
    useDeactivateItem: vi.fn(),
  };
});

const ACTIVE_ITEM: itemsApi.Item = {
  id: 'item-1',
  companyId: 'c1',
  type: 'PRODUCT',
  sku: 'SKU-1',
  name: 'Resma de papel A4',
  description: null,
  longDescription: null,
  barcode: '7790000000001',
  categoryId: null,
  unitOfMeasure: 'unidad',
  tracksStock: true,
  minimumStock: null,
  costPrice: '100.00',
  isActive: true,
  taxIds: [],
};

const deactivateMutateAsync = vi.fn().mockResolvedValue({ ...ACTIVE_ITEM, isActive: false });

beforeEach(() => {
  vi.mocked(itemsApi.useActivateItem).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(itemsApi.useDeactivateItem).mockReturnValue({
    mutateAsync: deactivateMutateAsync,
  } as any);
});

describe('ItemsTable', () => {
  it('sin permisos de gestión: no muestra "Editar"/"Desactivar" en las filas', () => {
    render(
      <ItemsTable
        companyId="c1"
        basePath="productos"
        items={[ACTIVE_ITEM]}
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
      <ItemsTable
        companyId="c1"
        basePath="productos"
        items={[ACTIVE_ITEM]}
        canManage={true}
        onEdit={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    await user.click(within(table).getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByText('¿Confirmás desactivar "Resma de papel A4"?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(deactivateMutateAsync).toHaveBeenCalledWith('item-1'));
  });

  it('el nombre del ítem enlaza al detalle bajo el basePath correcto', () => {
    render(
      <ItemsTable
        companyId="c1"
        basePath="servicios"
        items={[{ ...ACTIVE_ITEM, type: 'SERVICE', tracksStock: false }]}
        canManage={false}
        onEdit={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    const link = within(table).getByRole('link', { name: 'Resma de papel A4' });
    expect(link).toHaveAttribute('href', '/c1/catalogo/servicios/item-1');
  });
});
