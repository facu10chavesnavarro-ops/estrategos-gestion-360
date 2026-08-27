'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembersTable } from '@/components/configuracion/members-table';
import { InvitationsTable } from '@/components/configuracion/invitations-table';

export default function UsuariosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const router = useRouter();
  const { membership, isLoading } = useCurrentMembership(companyId);
  const canManage = membership
    ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
    : false;

  // Defensa en profundidad: el link ya está oculto en el layout, pero si
  // alguien entra por URL directa sin permiso, no lo dejamos en un
  // callejón sin salida (mismo principio de 02-navegacion-y-ux.md §1).
  useEffect(() => {
    if (!isLoading && !canManage) {
      router.replace(`/${companyId}/configuracion/empresa`);
    }
  }, [isLoading, canManage, companyId, router]);

  if (isLoading || !canManage) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <Tabs defaultValue="miembros">
      <TabsList>
        <TabsTrigger value="miembros">Miembros</TabsTrigger>
        <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
      </TabsList>
      <TabsContent value="miembros" className="pt-4">
        <MembersTable companyId={companyId} />
      </TabsContent>
      <TabsContent value="invitaciones" className="pt-4">
        <InvitationsTable companyId={companyId} />
      </TabsContent>
    </Tabs>
  );
}
