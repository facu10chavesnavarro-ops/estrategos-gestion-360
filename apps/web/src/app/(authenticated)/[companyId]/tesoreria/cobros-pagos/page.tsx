'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaymentsWithLabels, type PaymentDirection } from '@/lib/api/treasury/payments';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { PaymentsTable } from '@/components/tesoreria/payments-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DirectionFilter = 'all' | PaymentDirection;

export default function CobrosPagosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const router = useRouter();
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { rows, isLoading } = usePaymentsWithLabels(companyId, {
    direction: direction === 'all' ? undefined : direction,
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
      <PaymentsTable
        companyId={companyId}
        rows={rows}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={direction} onValueChange={(v) => v && setDirection(v as DirectionFilter)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="COLLECTION">Cobros</SelectItem>
                <SelectItem value="PAYMENT">Pagos</SelectItem>
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
                <Button onClick={() => router.push(`/${companyId}/tesoreria/nuevo/cobro`)}>
                  + Nuevo cobro
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${companyId}/tesoreria/nuevo/pago`)}
                >
                  + Nuevo pago
                </Button>
              </>
            )}
          </div>
        }
      />
    </div>
  );
}
