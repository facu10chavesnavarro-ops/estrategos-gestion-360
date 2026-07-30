import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomersTable } from './customers-table';
import * as customersApi from '@/lib/api/customers';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/c1/clientes',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/customers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/customers')>('@/lib/api/customers');
  return {
    ...actual,
    useActivateCustomer: vi.fn(),
    useDeactivateCustomer: vi.fn(),
  };
});

const ACTIVE_CUSTOMER: customersApi.Customer = {
  id: 'cust-1',
  partyId: 'party-1',
  companyId: 'c1',
  legalName: 'Cliente Activo SRL',
  taxId: '30-11111111-1',
  taxCondition: null,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  notes: null,
  paymentTermDays: 30,
  creditLimit: '1000.00',
  isActive: true,
};

const deactivateMutateAsync = vi.fn().mockResolvedValue({ ...ACTIVE_CUSTOMER, isActive: false });

beforeEach(() => {
  vi.mocked(customersApi.useActivateCustomer).mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.mocked(customersApi.useDeactivateCustomer).mockReturnValue({
    mutateAsync: deactivateMutateAsync,
  } as any);
});

describe('CustomersTable', () => {
  it('sin permisos de gestión: no muestra "Editar"/"Desactivar" en las filas', () => {
    render(
      <CustomersTable
        companyId="c1"
        customers={[ACTIVE_CUSTOMER]}
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
      <CustomersTable
        companyId="c1"
        customers={[ACTIVE_CUSTOMER]}
        canManage={true}
        onEdit={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    await user.click(within(table).getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByText('¿Confirmás desactivar a "Cliente Activo SRL"?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(deactivateMutateAsync).toHaveBeenCalledWith('cust-1'));
  });

  it('con permisos de gestión: "Editar" invoca el callback con el cliente', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <CustomersTable
        companyId="c1"
        customers={[ACTIVE_CUSTOMER]}
        canManage={true}
        onEdit={onEdit}
      />,
    );

    const table = screen.getByRole('table');
    await user.click(within(table).getByRole('button', { name: 'Editar' }));

    expect(onEdit).toHaveBeenCalledWith(ACTIVE_CUSTOMER);
  });
});
