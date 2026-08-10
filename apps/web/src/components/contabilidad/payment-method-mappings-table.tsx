'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePaymentMethods } from '@/lib/api/treasury/payment-methods';
import {
  type PaymentMethodAccountDirection,
  usePaymentMethodAccountMappings,
  useSetPaymentMethodAccountMapping,
} from '@/lib/api/accounting/settings';
import { ApiError } from '@/lib/api/http-client';
import { AccountSelect } from './account-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DIRECTION_LABELS: Record<PaymentMethodAccountDirection, string> = {
  COLLECTION: 'Cobro',
  PAYMENT: 'Pago',
};

/**
 * Mapeo medio de pago + sentido → cuenta contable (§2.1, §3.10,
 * docs/frontend/11-sprint-f8-contabilidad.md). Solo tiene sentido para
 * medios que no generan `CashMovement`/`BankMovement` automáticamente
 * — hoy, únicamente Cheque (el resto ya resuelve su cuenta vía
 * `CashRegister.accountId`/`BankAccount.glAccountId`).
 */
export function PaymentMethodMappingsTable({
  companyId,
  canManage,
}: {
  companyId: string;
  canManage: boolean;
}) {
  const paymentMethods = usePaymentMethods();
  const mappings = usePaymentMethodAccountMappings(companyId);
  const setMapping = useSetPaymentMethodAccountMapping(companyId);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const methodsNeedingMapping = (paymentMethods.data ?? []).filter(
    (m) => !m.requiresCashMovement && !m.requiresBankMovement,
  );

  if (paymentMethods.isLoading || mappings.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (methodsNeedingMapping.length === 0) {
    return null;
  }

  async function handleSet(paymentMethodId: string, direction: PaymentMethodAccountDirection, accountId: string) {
    setPendingKey(`${paymentMethodId}:${direction}`);
    try {
      await setMapping.mutateAsync({ paymentMethodId, direction, accountId });
      toast.success('Mapeo guardado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el mapeo');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeo de medios de pago</CardTitle>
        <CardDescription>
          El mismo medio de pago puede necesitar una cuenta contable distinta según sea un
          cobro o un pago (ej. Cheque recibido vs. cheque emitido).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {methodsNeedingMapping.map((method) =>
          (['COLLECTION', 'PAYMENT'] as PaymentMethodAccountDirection[]).map((direction) => {
            const key = `${method.id}:${direction}`;
            const current = (mappings.data ?? []).find(
              (m) => m.paymentMethodId === method.id && m.direction === direction,
            );
            return (
              <div key={key} className="grid gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
                <span className="text-sm font-medium">
                  {method.name} — {DIRECTION_LABELS[direction]}
                </span>
                <AccountSelect
                  companyId={companyId}
                  value={current?.accountId}
                  onChange={(accountId) => accountId && handleSet(method.id, direction, accountId)}
                  disabled={!canManage || pendingKey === key}
                  placeholder="Sin mapear"
                />
              </div>
            );
          }),
        )}
      </CardContent>
    </Card>
  );
}
