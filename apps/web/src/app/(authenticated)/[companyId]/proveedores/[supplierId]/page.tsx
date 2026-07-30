'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useSupplier, useSupplierCurrentAccount } from '@/lib/api/suppliers';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { SupplierSheet } from '@/components/proveedores/supplier-sheet';
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

export default function SupplierDetailPage({
  params,
}: {
  params: { companyId: string; supplierId: string };
}) {
  const supplier = useSupplier(params.companyId, params.supplierId);
  const currentAccount = useSupplierCurrentAccount(params.companyId, params.supplierId);
  const { membership } = useCurrentMembership(params.companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;
  const [editOpen, setEditOpen] = useState(false);

  if (supplier.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (supplier.isError || !supplier.data) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">
          {supplier.error instanceof ApiError
            ? supplier.error.message
            : 'No se pudo cargar el proveedor.'}
        </p>
        <Link href={`/${params.companyId}/proveedores`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const data = supplier.data;

  return (
    <div className="space-y-4 p-6">
      <Link
        href={`/${params.companyId}/proveedores`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Proveedores
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
          <Field label="Banco" value={data.bankName} />
          <Field label="Titular de cuenta" value={data.bankAccountHolder} />
          <Field label="CBU" value={data.bankCbu} />
          <div className="sm:col-span-3">
            <Field label="Notas" value={data.notes} />
          </div>
        </CardContent>
      </Card>

      <CurrentAccountPanel account={currentAccount.data} isLoading={currentAccount.isLoading} />

      <SupplierSheet
        companyId={params.companyId}
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={data}
      />
    </div>
  );
}
