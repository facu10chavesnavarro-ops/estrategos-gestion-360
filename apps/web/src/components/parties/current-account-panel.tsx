'use client';

import Link from 'next/link';
import type { CurrentAccountView } from '@/lib/api/customers';
import { formatMoney } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MOVEMENT_TYPE_LABEL: Record<'DEBIT' | 'CREDIT', string> = {
  DEBIT: 'Debe',
  CREDIT: 'Haber',
};

/**
 * Cuenta corriente embebida en el detalle de Cliente/Proveedor — el
 * endpoint es de `treasury`, pero mostrarla acá es más intuitivo que un
 * módulo aparte (03-plan-de-implementacion.md, F2). Sin paginación: el
 * backend devuelve todos los movimientos (aceptable hasta que F6 genere
 * volumen real). `voucherId` enlaza al detalle de Comprobantes (F5);
 * `paymentId` sigue sin link — Pagos todavía no tiene pantalla propia.
 */
export function CurrentAccountPanel({
  companyId,
  account,
  isLoading,
}: {
  companyId: string;
  account?: CurrentAccountView;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cuenta corriente</span>
          {!isLoading && account && (
            <span className="font-mono text-base font-normal">
              Saldo: {formatMoney(account.currentBalance)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !account || account.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.createdAt).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>{MOVEMENT_TYPE_LABEL[movement.type]}</TableCell>
                    <TableCell className="font-mono">{formatMoney(movement.amount)}</TableCell>
                    <TableCell className="font-mono">{formatMoney(movement.balanceAfter)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {movement.voucherId ? (
                        <Link
                          href={`/${companyId}/comprobantes/${movement.voucherId}`}
                          className="hover:underline"
                        >
                          Ver comprobante
                        </Link>
                      ) : movement.paymentId ? (
                        `Pago ${movement.paymentId.slice(0, 8)}`
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
