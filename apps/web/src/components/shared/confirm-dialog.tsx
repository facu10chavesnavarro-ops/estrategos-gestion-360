'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  /** Si se pasa, pide un motivo obligatorio (RN-003: toda desactivación
   * de Empresa/Sucursal lo exige) antes de habilitar el botón confirmar. */
  requireReason?: boolean;
  isSubmitting?: boolean;
  onConfirm: (reason?: string) => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'default',
  requireReason = false,
  isSubmitting = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const reasonInvalid = requireReason && reason.trim().length < 3;

  function handleOpenChange(next: boolean) {
    if (!next) setReason('');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireReason && (
          <div className="grid gap-2">
            <Label htmlFor="confirm-dialog-reason">Motivo</Label>
            <Textarea
              id="confirm-dialog-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: sucursal cerrada definitivamente"
            />
            {reason.length > 0 && reasonInvalid && (
              <p className="text-sm text-destructive">
                El motivo debe tener al menos 3 caracteres.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={isSubmitting || (requireReason && reasonInvalid)}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
          >
            {isSubmitting ? 'Confirmando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
