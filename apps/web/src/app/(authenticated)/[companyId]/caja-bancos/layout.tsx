'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function CajaBancosLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  const pathname = usePathname();

  const isBancos = pathname.startsWith(`/${params.companyId}/caja-bancos/bancos`);
  const tabs = [
    { href: `/${params.companyId}/caja-bancos/caja`, label: 'Caja', active: !isBancos },
    { href: `/${params.companyId}/caja-bancos/bancos`, label: 'Bancos', active: isBancos },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Caja y Bancos</h1>
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
