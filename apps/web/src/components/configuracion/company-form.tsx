'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type Company, useUpdateCompany } from '@/lib/api/companies';
import { ApiError } from '@/lib/api/http-client';
import { omitEmptyStrings } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const companySchema = z.object({
  legalName: z.string().min(2, 'La razón social debe tener al menos 2 caracteres'),
  taxId: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{11}$/.test(v.replace(/-/g, '')),
      'El CUIT debe tener el formato NN-NNNNNNNN-N (con o sin guiones)',
    ),
  taxCondition: z.string().optional(),
  activity: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('El correo de contacto no tiene un formato válido').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  logoUrl: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

function toFormValues(company: Company): CompanyFormValues {
  return {
    legalName: company.legalName,
    taxId: company.taxId ?? '',
    taxCondition: company.taxCondition ?? '',
    activity: company.activity ?? '',
    address: company.address ?? '',
    contactName: company.contactName ?? '',
    contactEmail: company.contactEmail ?? '',
    contactPhone: company.contactPhone ?? '',
    logoUrl: company.logoUrl ?? '',
    currency: company.currency ?? '',
    timezone: company.timezone ?? '',
  };
}

export function CompanyForm({ company, readOnly }: { company: Company; readOnly: boolean }) {
  const updateCompany = useUpdateCompany(company.id);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: toFormValues(company),
  });

  useEffect(() => {
    form.reset(toFormValues(company));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function onSubmit(values: CompanyFormValues) {
    try {
      await updateCompany.mutateAsync(omitEmptyStrings(values));
      toast.success('Datos de la empresa actualizados');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudieron guardar los cambios');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="legalName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Razón social</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actividad</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
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
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo de contacto</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} readOnly={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de contacto</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del logo</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración regional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={readOnly} placeholder="ARS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Huso horario</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={readOnly} placeholder="America/Argentina/Buenos_Aires" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {!readOnly && (
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      </form>
    </Form>
  );
}
