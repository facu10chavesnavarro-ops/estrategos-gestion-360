'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { acceptInvitation } from '@/lib/api/invitations-public';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const acceptSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo es obligatorio'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type AcceptFormValues = z.infer<typeof acceptSchema>;

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AcceptFormValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { fullName: '', password: '' },
  });

  async function onSubmit(values: AcceptFormValues) {
    setFormError(null);
    try {
      await acceptInvitation(token, values);
      router.push('/login?invitacion=aceptada');
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo conectar con el servidor. Intentá de nuevo.',
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creando cuenta…' : 'Aceptar invitación'}
        </Button>
      </form>
    </Form>
  );
}
