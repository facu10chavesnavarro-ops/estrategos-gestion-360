import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryTree } from './category-tree';
import * as categoriesApi from '@/lib/api/catalog/categories';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/lib/api/catalog/categories', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/catalog/categories')>(
    '@/lib/api/catalog/categories',
  );
  return {
    ...actual,
    useActivateCategory: vi.fn(),
    useDeactivateCategory: vi.fn(),
  };
});

const ROOT: categoriesApi.Category = {
  id: 'cat-1',
  companyId: 'c1',
  parentId: null,
  name: 'Electrónica',
  isActive: true,
  salesAccountId: null,
  purchasesAccountId: null,
};

const CHILD: categoriesApi.Category = {
  id: 'cat-2',
  companyId: 'c1',
  parentId: 'cat-1',
  name: 'Celulares',
  isActive: true,
  salesAccountId: null,
  purchasesAccountId: null,
};

const deactivateMutateAsync = vi.fn().mockResolvedValue({ ...ROOT, isActive: false });

beforeEach(() => {
  vi.mocked(categoriesApi.useActivateCategory).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(categoriesApi.useDeactivateCategory).mockReturnValue({
    mutateAsync: deactivateMutateAsync,
  } as any);
});

describe('CategoryTree', () => {
  it('renderiza subcategorías anidadas bajo su categoría padre', () => {
    render(
      <CategoryTree
        companyId="c1"
        categories={[ROOT, CHILD]}
        canManage={false}
        onEdit={vi.fn()}
        onAddChild={vi.fn()}
      />,
    );

    expect(screen.getByText('Electrónica')).toBeInTheDocument();
    expect(screen.getByText('Celulares')).toBeInTheDocument();
  });

  it('sin permisos de gestión: no muestra controles de alta/edición', () => {
    render(
      <CategoryTree
        companyId="c1"
        categories={[ROOT]}
        canManage={false}
        onEdit={vi.fn()}
        onAddChild={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Subcategoría/ })).toBeNull();
  });

  it('con permisos de gestión: desactivar pide confirmación', async () => {
    const user = userEvent.setup();
    render(
      <CategoryTree
        companyId="c1"
        categories={[ROOT]}
        canManage={true}
        onEdit={vi.fn()}
        onAddChild={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(await screen.findByText('¿Confirmás desactivar "Electrónica"?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(deactivateMutateAsync).toHaveBeenCalledWith('cat-1'));
  });

  it('muestra un mensaje claro cuando no hay categorías', () => {
    render(
      <CategoryTree companyId="c1" categories={[]} canManage={false} onEdit={vi.fn()} onAddChild={vi.fn()} />,
    );

    expect(screen.getByText('Todavía no hay categorías.')).toBeInTheDocument();
  });
});
