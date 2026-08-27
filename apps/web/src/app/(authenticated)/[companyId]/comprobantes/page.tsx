'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVouchersWithLabels } from '@/lib/api/vouchers/vouchers';
import { useVoucherTypes } from '@/lib/api/vouchers/voucher-types';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { VouchersTable } from '@/components/comprobantes/vouchers-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ComprobantesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const router = useRouter();
  const [voucherTypeId, setVoucherTypeId] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const voucherTypes = useVoucherTypes();
  const { rows, isLoading } = useVouchersWithLabels(companyId, {
    voucherTypeId: voucherTypeId === 'all' ? undefined : voucherTypeId,
    from: from || undefined,
    to: to || undefined,
  });
  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  if (isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <VouchersTable
        companyId={companyId}
        rows={rows}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={voucherTypeId} onValueChange={(v) => v && setVoucherTypeId(v)}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(voucherTypes.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-36"
              aria-label="Desde"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-36"
              aria-label="Hasta"
            />
            {canManage && (
              <>
                <Button onClick={() => router.push(`/${companyId}/comprobantes/nuevo/venta`)}>
                  + Factura de venta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${companyId}/comprobantes/nuevo/compra`)}
                >
                  + Factura de compra
                </Button>
              </>
            )}
          </div>
        }
      />
    </div>
  );
}
