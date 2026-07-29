'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { useCreateInvitation, useRoles } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const invitationSchema = z.object({
  email: z.string().email('Ingresá un correo válido'),
  roleId: z.string().min(1, 'Elegí un rol'),
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

export function CreateInvitationDialog({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const roles = useRoles();
  const createInvitation = useCreateInvitation(companyId);

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', roleId: '' },
  });

  async function onSubmit(values: InvitationFormValues) {
    try {
      const result = await createInvitation.mutateAsync(values);
      setCreatedLink(`${window.location.origin}/invitaciones/${result.token}`);
      form.reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo crear la invitación');
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCreatedLink(null);
      form.reset();
    }
  }

  async function copyLink() {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    toast.success('Link copiado');
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>+ Invitar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a un usuario</DialogTitle>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copiá este link ahora — el sistema no lo va a poder mostrar de nuevo.
            </p>
            <div className="flex items-center gap-2">
              <Input value={createdLink} readOnly />
              <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.data?.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Enviando…' : 'Invitar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
