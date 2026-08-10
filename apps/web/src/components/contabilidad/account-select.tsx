'use client';

import { useImputableActiveAccounts } from '@/lib/api/accounting/chart-of-accounts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = '__none__';

/**
 * Selector reutilizable de `ChartOfAccount`, filtrado a cuentas
 * imputables y activas (§3.4/§3.8/§3.9/§3.10,
 * docs/frontend/11-sprint-f8-contabilidad.md) — las únicas que pueden
 * recibir líneas de asiento o mapeos. Usado tanto en el alta manual de
 * asientos como en el retrofit de Categorías/Impuestos (F3) y Caja/
 * Bancos (F7).
 */
export function AccountSelect({
  companyId,
  value,
  onChange,
  allowNone = false,
  noneLabel = '(sin mapear)',
  placeholder = 'Elegir cuenta...',
  disabled = false,
}: {
  companyId: string;
  value: string | null | undefined;
  onChange: (accountId: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const accounts = useImputableActiveAccounts(companyId);
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <Select
      value={value ?? (allowNone ? NONE : undefined)}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {sorted.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.code} — {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
