'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ContabilidadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  const pathname = usePathname();
  const base = `/${params.companyId}/contabilidad`;

  const tabs = [
    { href: `${base}/plan-de-cuentas`, label: 'Plan de Cuentas', match: 'plan-de-cuentas' },
    { href: `${base}/asientos`, label: 'Asientos', match: 'asientos' },
    { href: `${base}/libro-mayor`, label: 'Libro Mayor', match: 'libro-mayor' },
    { href: `${base}/configuracion`, label: 'Configuración', match: 'configuracion' },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Contabilidad</h1>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              pathname.startsWith(`${base}/${tab.match}`)
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
