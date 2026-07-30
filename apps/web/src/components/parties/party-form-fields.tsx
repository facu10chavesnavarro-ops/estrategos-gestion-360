'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

/**
 * Campos compartidos por Cliente y Proveedor (datos del `Party` común —
 * ver docs/sprint-2/01-clientes-proveedores.md §0.4). No recibe `control`
 * por prop: `FormField`/`Controller` de react-hook-form ya resuelven el
 * control activo vía `useFormContext()` cuando no se les pasa uno
 * explícito, así que este fragmento se usa dentro de cualquier `<Form
 * {...form}>` (el `FormProvider` de shadcn) sin acoplarse al tipo exacto
 * de `CustomerFormValues`/`SupplierFormValues` de quien lo use — evita
 * pelear con la varianza de `Control<T>` de RHF para un beneficio de
 * tipado que acá no es real (los nombres de campo son los mismos string
 * literales en ambos formularios).
 */
export function PartyFormFields({ readOnly }: { readOnly?: boolean }) {
  return (
    <>
      <FormField
        name="legalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Razón social</FormLabel>
            <FormControl>
              <Input {...field} readOnly={readOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="taxId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CUIT</FormLabel>
            <FormControl>
              <Input {...field} readOnly={readOnly} placeholder="30-12345678-9" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="taxCondition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Condición fiscal</FormLabel>
            <FormControl>
              <Input {...field} readOnly={readOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Correo</FormLabel>
            <FormControl>
              <Input type="email" {...field} readOnly={readOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Teléfono</FormLabel>
            <FormControl>
              <Input {...field} readOnly={readOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dirección</FormLabel>
            <FormControl>
              <Input {...field} readOnly={readOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="contactName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre de contacto</FormLabel>
            <FormControl>
              <Input {...field} readOnly={readOnly} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas</FormLabel>
            <FormControl>
              <Textarea {...field} readOnly={readOnly} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
