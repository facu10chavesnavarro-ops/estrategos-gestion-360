'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { type JournalEntry, useReverseJournalEntry } from '@/lib/api/accounting/journal-entries';
import { ApiError } from '@/lib/api/http-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SOURCE_LABELS: Record<string, string> = {
  VOUCHER: 'el Comprobante',
  PAYMENT: 'el Cobro/Pago',
};

/**
 * Confirmación de reversión (F8 §3.2, docs/frontend/11-sprint-f8-contabilidad.md).
 * Para asientos `AUTOMATIC` agrega una advertencia explícita: revertir
 * corrige solo la contabilidad, no anula ni modifica la operación de
 * negocio que generó el asiento.
 */
export function ReverseEntryDialog({
  companyId,
  open,
  onOpenChange,
  entry,
  onReversed,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: JournalEntry;
  onReversed?: (newEntry: JournalEntry) => void;
}) {
  const reverseEntry = useReverseJournalEntry(companyId);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const newEntry = await reverseEntry.mutateAsync(entry.id);
      toast.success('Asiento revertido');
      onOpenChange(false);
      onReversed?.(newEntry);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo revertir el asiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revertir asiento</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Se creará un asiento nuevo que invierte los débitos y créditos de este. El asiento
              original no se modifica ni se elimina — los asientos son inmutables.
            </p>
            {entry.origin === 'AUTOMATIC' && (
              <p className="font-medium text-destructive">
                Este asiento fue generado automáticamente por{' '}
                {entry.sourceType ? SOURCE_LABELS[entry.sourceType] ?? 'la operación de origen' : 'la operación de origen'}
                . Revertirlo corrige solo la contabilidad — no anula ni modifica esa operación. Si
                el error está en la operación de negocio, corregila desde donde se originó.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={submitting} onClick={handleConfirm}>
            {submitting ? 'Revirtiendo…' : 'Revertir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
