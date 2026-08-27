'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useJournalEntry,
  useAllJournalEntries,
  isJournalEntryReversed,
} from '@/lib/api/accounting/journal-entries';
import { useChartOfAccounts } from '@/lib/api/accounting/chart-of-accounts';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { ReverseEntryDialog } from '@/components/contabilidad/reverse-entry-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/utils';

const SOURCE_LINK: Record<string, (companyId: string, sourceId: string) => string> = {
  VOUCHER: (companyId, sourceId) => `/${companyId}/comprobantes/${sourceId}`,
  PAYMENT: (companyId, sourceId) => `/${companyId}/tesoreria/cobros-pagos/${sourceId}`,
};

const SOURCE_LABELS: Record<string, string> = {
  VOUCHER: 'Ver comprobante de origen',
  PAYMENT: 'Ver cobro/pago de origen',
};

/** Detalle de asiento: líneas, origen, reversión (F8 §5.5). */
export default function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; journalEntryId: string }>;
}) {
  const { companyId, journalEntryId } = use(params);
  const router = useRouter();
  const entry = useJournalEntry(companyId, journalEntryId);
  const allEntries = useAllJournalEntries(companyId);
  const accounts = useChartOfAccounts(companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;
  const [reverseOpen, setReverseOpen] = useState(false);

  if (entry.isLoading || accounts.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (entry.isError || !entry.data) {
    return (
      <p className="text-sm text-destructive">
        {entry.error instanceof ApiError ? entry.error.message : 'No se pudo cargar el asiento.'}
      </p>
    );
  }

  const data = entry.data;
  const accountsById = new Map((accounts.data ?? []).map((a) => [a.id, a]));
  const totalDebit = data.lines.reduce((sum, l) => sum + Number(l.debit || '0'), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + Number(l.credit || '0'), 0);
  const alreadyReversed = isJournalEntryReversed(allEntries.data ?? [], data.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{data.description}</CardTitle>
            {canManage && !data.reversalOfEntryId && !alreadyReversed && (
              <Button variant="outline" onClick={() => setReverseOpen(true)}>
                Revertir
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {new Date(data.date).toLocaleDateString('es-AR')} · {data.currency}
          </span>
          <StatusBadge label={data.origin === 'MANUAL' ? 'Manual' : 'Automático'} tone="neutral" />
          {alreadyReversed && <StatusBadge label="Revertido" tone="warning" />}
          {data.reversalOfEntryId && (
            <Link
              href={`/${companyId}/contabilidad/asientos/${data.reversalOfEntryId}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Revierte a un asiento anterior →
            </Link>
          )}
          {data.sourceType && data.sourceId && (
            <Link
              href={SOURCE_LINK[data.sourceType](companyId, data.sourceId)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {SOURCE_LABELS[data.sourceType]} →
            </Link>
          )}
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuenta</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Débito</TableHead>
            <TableHead className="text-right">Crédito</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.lines.map((line) => {
            const account = accountsById.get(line.accountId);
            return (
              <TableRow key={line.id}>
                <TableCell>
                  <Link
                    href={`/${companyId}/contabilidad/plan-de-cuentas/${line.accountId}`}
                    className="hover:underline"
                  >
                    {account ? `${account.code} — ${account.name}` : line.accountId}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{line.description ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">
                  {Number(line.debit) > 0 ? formatMoney(line.debit) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(line.credit) > 0 ? formatMoney(line.credit) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell colSpan={2} className="text-right font-medium">
              Totales
            </TableCell>
            <TableCell className="text-right font-mono font-medium">{formatMoney(totalDebit.toFixed(2))}</TableCell>
            <TableCell className="text-right font-mono font-medium">{formatMoney(totalCredit.toFixed(2))}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <ReverseEntryDialog
        companyId={companyId}
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        entry={data}
        onReversed={(newEntry) =>
          router.push(`/${companyId}/contabilidad/asientos/${newEntry.id}`)
        }
      />
    </div>
  );
}
