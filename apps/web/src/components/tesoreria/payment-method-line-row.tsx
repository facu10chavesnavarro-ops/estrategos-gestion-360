'use client';

import { useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import type { PaymentMethod } from '@/lib/api/treasury/payment-methods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { TableCell, TableRow } from '@/components/ui/table';
import type { PaymentFormValues } from './payment-form';

/**
 * Fila de medio de pago dentro de PaymentForm (F6 §5.4) — un Payment
 * puede combinar varias (pago/cobro mixto). Los campos de Cheque solo
 * se muestran si el medio elegido lo requiere (RN-PAY-07); Tarjeta
 * admite una referencia libre pero el backend no exige más datos
 * (relevamiento §5 del informe F6).
 */
export function PaymentMethodLineRow({
  index,
  paymentMethods,
  onRemove,
  canRemove,
}: {
  index: number;
  paymentMethods: PaymentMethod[];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { control, watch } = useFormContext<PaymentFormValues>();
  const paymentMethodId = watch(`methodDetails.${index}.paymentMethodId`);
  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId);

  return (
    <TableRow>
      <TableCell className="min-w-40 align-top">
        <FormField
          control={control}
          name={`methodDetails.${index}.paymentMethodId`}
          render={({ field }) => (
            <FormItem>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un medio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="min-w-28 align-top">
        <FormField
          control={control}
          name={`methodDetails.${index}.amount`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input inputMode="decimal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="min-w-56 align-top">
        {selectedMethod?.requiresCheckDetail ? (
          <div className="flex flex-col gap-1">
            <FormField
              control={control}
              name={`methodDetails.${index}.checkNumber`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="N.º de cheque" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`methodDetails.${index}.checkBankName`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Banco" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`methodDetails.${index}.checkDueDate`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <FormField
            control={control}
            name={`methodDetails.${index}.reference`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Referencia (opcional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </TableCell>
      <TableCell className="align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Quitar medio de pago"
        >
          <X className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
