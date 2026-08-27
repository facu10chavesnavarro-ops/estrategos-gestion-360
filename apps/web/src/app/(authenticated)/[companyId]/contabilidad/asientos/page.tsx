'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useJournalEntries,
  useAllJournalEntries,
  type JournalEntryOrigin,
} from '@/lib/api/accounting/journal-entries';
import { useAccountingSettings } from '@/lib/api/accounting/settings';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { AccountingActivationCard } from '@/components/contabilidad/accounting-activation-card';
import { JournalEntriesTable } from '@/components/contabilidad/journal-entries-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type OriginFilter = 'all' | JournalEntryOrigin;

/** Libro Diario / listado de asientos (F8 §5.4). */
export default function AsientosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const router = useRouter();
  const settings = useAccountingSettings(companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [origin, setOrigin] = useState<OriginFilter>('all');

  const entries = useJournalEntries(companyId, { from: from || undefined, to: to || undefined });
  const allEntries = useAllJournalEntries(companyId);

  if (settings.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!settings.isSuccess) {
    return <AccountingActivationCard companyId={companyId} canManage={canManage} />;
  }

  if (entries.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const filtered = (entries.data ?? []).filter(
    (e) => origin === 'all' || e.origin === origin,
  );

  return (
    <JournalEntriesTable
      companyId={companyId}
      entries={filtered}
      allEntries={allEntries.data ?? []}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
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
          <Select value={origin} onValueChange={(v) => v && setOrigin(v as OriginFilter)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="AUTOMATIC">Automáticos</SelectItem>
              <SelectItem value="MANUAL">Manuales</SelectItem>
            </SelectContent>
          </Select>
          {canManage && (
            <Button onClick={() => router.push(`/${companyId}/contabilidad/asientos/nuevo`)}>
              + Nuevo asiento
            </Button>
          )}
        </div>
      }
    />
  );
}
