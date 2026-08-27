'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { cn } from '@/lib/utils';

export default function ConfiguracionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const pathname = usePathname();
  const { membership, isLoading } = useCurrentMembership(companyId);
  // Mientras no se sepa el rol propio, "Usuarios" queda oculto (fail-closed) —
  // ver decisión 2.2 de docs/frontend/04-sprint-f1-configuracion.md.
  const canManage =
    !isLoading && membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;

  const tabs = [
    { href: `/${companyId}/configuracion/empresa`, label: 'Empresa', show: true },
    { href: `/${companyId}/configuracion/usuarios`, label: 'Usuarios', show: canManage },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Configuración</h1>
      <nav className="mb-6 flex gap-1 border-b border-border">
        {tabs
          .filter((tab) => tab.show)
          .map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                pathname === tab.href
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
      </nav>
      {children}
    </div>
  );
}
