import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusBadgeTone = 'active' | 'inactive' | 'pending' | 'warning' | 'neutral';

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  active: 'bg-[var(--ledger-green)]/10 text-[var(--ledger-green)]',
  inactive: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  warning: 'bg-destructive/10 text-destructive',
  neutral: 'bg-secondary text-secondary-foreground',
};

/**
 * Mismo código de color en toda la app para activo/inactivo y estados
 * derivados (pendiente/vencida/etc.) — ver 02-navegacion-y-ux.md §2.
 */
export function StatusBadge({ label, tone }: { label: string; tone: StatusBadgeTone }) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-normal', TONE_CLASSES[tone])}>
      {label}
    </Badge>
  );
}

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <StatusBadge
      label={isActive ? 'Activo' : 'Inactivo'}
      tone={isActive ? 'active' : 'inactive'}
    />
  );
}
