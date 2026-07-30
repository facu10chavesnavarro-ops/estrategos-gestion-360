'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useCustomer, useCustomerCurrentAccount } from '@/lib/api/customers';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { CustomerSheet } from '@/components/clientes/customer-sheet';
import { CurrentAccountPanel } from '@/components/parties/current-account-panel';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

export default function CustomerDetailPage({
  params,
}: {
  params: { companyId: string; customerId: string };
}) {
  const customer = useCustomer(params.companyId, params.customerId);
  const currentAccount = useCustomerCurrentAccount(params.companyId, params.customerId);
  const { membership } = useCurrentMembership(params.companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;
  const [editOpen, setEditOpen] = useState(false);

  if (customer.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (customer.isError || !customer.data) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">
          {customer.error instanceof ApiError
            ? customer.error.message
            : 'No se pudo cargar el cliente.'}
        </p>
        <Link href={`/${params.companyId}/clientes`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const data = customer.data;

  return (
    <div className="space-y-4 p-6">
      <Link
        href={`/${params.companyId}/clientes`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clientes
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{data.legalName}</h1>
          <ActiveStatusBadge isActive={data.isActive} />
        </div>
        {canManage && <Button onClick={() => setEditOpen(true)}>Editar</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="CUIT" value={data.taxId} />
          <Field label="Condición fiscal" value={data.taxCondition} />
          <Field label="Email" value={data.email} />
          <Field label="Teléfono" value={data.phone} />
          <Field label="Dirección" value={data.address} />
          <Field label="Contacto" value={data.contactName} />
          <Field label="Días de pago" value={data.paymentTermDays} />
          <Field label="Límite de crédito" value={data.creditLimit} />
          <div className="sm:col-span-3">
            <Field label="Notas" value={data.notes} />
          </div>
        </CardContent>
      </Card>

      <CurrentAccountPanel account={currentAccount.data} isLoading={currentAccount.isLoading} />

      <CustomerSheet
        companyId={params.companyId}
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={data}
      />
    </div>
  );
}
