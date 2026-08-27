'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTreasuryOverview } from '@/lib/api/treasury/overview';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TesoreriaOverviewPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const router = useRouter();
  const { totalReceivable, totalPayable, isLoading } = useTreasuryOverview(companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total a cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <p className="font-mono text-2xl font-semibold">{formatMoney(totalReceivable.toFixed(2))}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total a pagar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <p className="font-mono text-2xl font-semibold">{formatMoney(totalPayable.toFixed(2))}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/${companyId}/tesoreria/nuevo/cobro`)}>
            + Nuevo cobro
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${companyId}/tesoreria/nuevo/pago`)}>
            + Nuevo pago
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${companyId}/caja-bancos/caja`)}>
            Ir a Caja y Bancos
          </Button>
        </div>
      )}
    </div>
  );
}
