'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, CONFIG_NAV_ITEM, type NavItem } from './nav-items';

function NavLink({
  item,
  companyId,
  collapsed,
  isActive,
}: {
  item: NavItem;
  companyId: string;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;
  const className = cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-foreground/80 hover:bg-muted hover:text-foreground',
    collapsed && 'justify-center px-2',
  );

  if (item.href) {
    return (
      <Link href={`/${companyId}/${item.href}`} className={className} title={item.label}>
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={item.label}
      onClick={() => toast.info(`${item.label}: próximamente`)}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

export function SidebarNav({
  companyId,
  collapsed,
}: {
  companyId: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
      <div className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            companyId={companyId}
            collapsed={collapsed}
            isActive={Boolean(item.href) && pathname === `/${companyId}/${item.href}`}
          />
        ))}
      </div>
      <div className="my-1 h-px bg-border" />
      <NavLink
        item={CONFIG_NAV_ITEM}
        companyId={companyId}
        collapsed={collapsed}
        isActive={false}
      />
    </nav>
  );
}
