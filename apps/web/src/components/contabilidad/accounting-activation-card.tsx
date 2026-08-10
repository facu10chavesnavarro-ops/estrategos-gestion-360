'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useActivateAccounting } from '@/lib/api/accounting/settings';
import { ApiError } from '@/lib/api/http-client';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * CTA de activación (F8 §5.1). Clona 18 cuentas estándar y crea
 * `AccountingSettings` con las cuentas de control ya resueltas — no
 * existe un caso de uso de desactivación, se documenta como acción no
 * reversible desde la UI.
 */
export function AccountingActivationCard({
  companyId,
  canManage,
}: {
  companyId: string;
  canManage: boolean;
}) {
  const activateAccounting = useActivateAccounting(companyId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleActivate() {
    try {
      await activateAccounting.mutateAsync();
      toast.success('Contabilidad activada');
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo activar Contabilidad');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activar Contabilidad</CardTitle>
        <CardDescription>
          Clona un Plan de Cuentas estándar (18 cuentas) y crea las cuentas de control de
          Deudores por Ventas y Proveedores. A partir de ese momento, cada Comprobante, Cobro,
          Pago y movimiento de Caja/Bancos genera automáticamente su asiento contable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer desde la aplicación. Sin activarla, Comprobantes,
          Tesorería y Caja y Bancos siguen funcionando exactamente igual que hasta ahora.
        </p>
        {canManage && (
          <Button onClick={() => setConfirmOpen(true)}>Activar Contabilidad</Button>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Activar Contabilidad"
        description="Se creará el Plan de Cuentas estándar (18 cuentas) y la configuración contable de la empresa. ¿Confirmás?"
        confirmLabel="Activar"
        isSubmitting={activateAccounting.isPending}
        onConfirm={handleActivate}
      />
    </Card>
  );
}
