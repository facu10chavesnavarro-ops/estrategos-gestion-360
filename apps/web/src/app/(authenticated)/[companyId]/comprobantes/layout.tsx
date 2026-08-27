'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ComprobantesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const pathname = usePathname();
  const isPuntosDeVenta = pathname.startsWith(`/${companyId}/comprobantes/puntos-de-venta`);

  const tabs = [
    { href: `/${companyId}/comprobantes`, label: 'Comprobantes', active: !isPuntosDeVenta },
    {
      href: `/${companyId}/comprobantes/puntos-de-venta`,
      label: 'Puntos de venta',
      active: isPuntosDeVenta,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Comprobantes</h1>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              tab.active
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
