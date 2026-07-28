'use client';

import { useLogout } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';

/**
 * Placeholder hasta que exista el AppShell (Sprint F0, siguiente tarea):
 * confirma que el flujo de auth completo (login → selector de empresa →
 * esta pantalla → logout) funciona de punta a punta antes de construir el
 * shell visual definitivo.
 */
export default function InicioPage({ params }: { params: { companyId: string } }) {
  const logout = useLogout();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-lg font-semibold">Bienvenido a Estrategos Gestión 360</h1>
      <p className="text-sm text-muted-foreground">Empresa activa: {params.companyId}</p>
      <Button variant="outline" onClick={() => logout()}>
        Cerrar sesión
      </Button>
    </main>
  );
}
