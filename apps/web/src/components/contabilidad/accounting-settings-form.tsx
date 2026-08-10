'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type AccountingSettings, useUpdateAccountingSettings } from '@/lib/api/accounting/settings';
import { ApiError } from '@/lib/api/http-client';
import { AccountSelect } from './account-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

/**
 * Edición de las dos cuentas de control (§2.1, §3.7,
 * docs/frontend/11-sprint-f8-contabilidad.md) — genéricas para todos
 * los clientes/proveedores de la empresa, no hay mapeo por tercero.
 */
export function AccountingSettingsForm({
  companyId,
  settings,
  canManage,
}: {
  companyId: string;
  settings: AccountingSettings;
  canManage: boolean;
}) {
  const updateSettings = useUpdateAccountingSettings(companyId);
  const [accountsReceivableId, setAccountsReceivableId] = useState(settings.accountsReceivableId);
  const [accountsPayableId, setAccountsPayableId] = useState(settings.accountsPayableId);

  useEffect(() => {
    setAccountsReceivableId(settings.accountsReceivableId);
    setAccountsPayableId(settings.accountsPayableId);
  }, [settings]);

  const dirty =
    accountsReceivableId !== settings.accountsReceivableId ||
    accountsPayableId !== settings.accountsPayableId;

  async function handleSave() {
    try {
      await updateSettings.mutateAsync({ accountsReceivableId, accountsPayableId });
      toast.success('Configuración contable actualizada');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la configuración');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas de control</CardTitle>
        <CardDescription>
          Todas las cuentas por cobrar de todos los clientes se imputan a la cuenta de Deudores
          por Ventas; todas las cuentas por pagar de todos los proveedores, a la de Proveedores.
          No existe un mapeo por cliente o proveedor individual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Deudores por Ventas (cuentas a cobrar)</Label>
          <AccountSelect
            companyId={companyId}
            value={accountsReceivableId}
            onChange={(v) => v && setAccountsReceivableId(v)}
            disabled={!canManage}
          />
        </div>
        <div className="grid gap-2">
          <Label>Proveedores (cuentas a pagar)</Label>
          <AccountSelect
            companyId={companyId}
            value={accountsPayableId}
            onChange={(v) => v && setAccountsPayableId(v)}
            disabled={!canManage}
          />
        </div>
        {canManage && (
          <Button onClick={handleSave} disabled={!dirty || updateSettings.isPending}>
            {updateSettings.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
