'use client';

import { formatMoney } from '@/lib/utils';
import type { PaymentDirection } from '@/lib/api/treasury/payments';

/**
 * Resumen antes de confirmar (F6 §5.4 del brief): deuda seleccionada,
 * importe imputado, saldo restante, total cargado en medios de pago.
 */
export function PaymentSummary({
  direction,
  totalSelected,
  totalAllocated,
  totalMethods,
}: {
  direction: PaymentDirection;
  totalSelected: number;
  totalAllocated: number;
  totalMethods: number;
}) {
  const remaining = totalSelected - totalAllocated;
  const surplus = totalMethods - totalAllocated;
  const verb = direction === 'COLLECTION' ? 'cobrar' : 'pagar';

  return (
    <div className="max-w-sm space-y-1 rounded-lg border border-border p-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Deuda seleccionada</span>
        <span className="font-mono">{formatMoney(totalSelected.toFixed(2))}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Importe a imputar</span>
        <span className="font-mono">{formatMoney(totalAllocated.toFixed(2))}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Saldo restante de lo seleccionado</span>
        <span className="font-mono">{formatMoney(remaining.toFixed(2))}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
        <span>Total a {verb}</span>
        <span className="font-mono">{formatMoney(totalMethods.toFixed(2))}</span>
      </div>
      {surplus > 0.001 && (
        <p className="text-xs text-muted-foreground">
          Quedará {formatMoney(surplus.toFixed(2))} como saldo a favor en la cuenta corriente.
        </p>
      )}
      {surplus < -0.001 && (
        <p className="text-xs text-destructive">
          El importe imputado supera el total cargado en medios de pago — ajustá los montos antes
          de confirmar.
        </p>
      )}
    </div>
  );
}
