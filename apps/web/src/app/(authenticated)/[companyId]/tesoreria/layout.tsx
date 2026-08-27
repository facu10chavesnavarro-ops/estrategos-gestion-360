'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function TesoreriaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const pathname = usePathname();

  const isOverview = pathname === `/${companyId}/tesoreria`;
  const tabs = [
    { href: `/${companyId}/tesoreria`, label: 'Vista general', active: isOverview },
    {
      href: `/${companyId}/tesoreria/cobros-pagos`,
      label: 'Cobros y pagos',
      active: !isOverview,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Tesorería</h1>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
