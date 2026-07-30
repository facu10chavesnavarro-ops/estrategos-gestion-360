'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function CatalogoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  const pathname = usePathname();

  const tabs = [
    { href: `/${params.companyId}/catalogo/productos`, label: 'Productos' },
    { href: `/${params.companyId}/catalogo/servicios`, label: 'Servicios' },
    { href: `/${params.companyId}/catalogo/categorias`, label: 'Categorías' },
    { href: `/${params.companyId}/catalogo/impuestos`, label: 'Impuestos' },
    { href: `/${params.companyId}/catalogo/listas-de-precio`, label: 'Listas de precio' },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Catálogo</h1>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              pathname.startsWith(tab.href)
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
