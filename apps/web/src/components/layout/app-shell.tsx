'use client';

import { useState } from 'react';
import { Menu, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useSessionStore } from '@/lib/stores/use-session-store';
import { useUiStore } from '@/lib/stores/use-ui-store';
import { useLogout } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarNav } from './sidebar';
import { CompanySwitcher } from './company-switcher';

function initials(nameOrEmail: string) {
  const parts = nameOrEmail.trim().split(/\s+/);
  const letters = parts.length > 1 ? [parts[0][0], parts[1][0]] : [nameOrEmail[0]];
  return letters.join('').toUpperCase();
}

export function AppShell({
  companyId,
  children,
}: {
  companyId: string;
  children: React.ReactNode;
}) {
  const user = useSessionStore((state) => state.user);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const logout = useLogout();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-[var(--paper-card)] px-3">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </Button>

        <span className="font-heading text-sm font-bold tracking-[0.02em]">ESTRATEGOS</span>

        <div className="ml-2">
          <CompanySwitcher companyId={companyId} />
        </div>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar size="sm">
                    <AvatarFallback>{initials(user?.fullName ?? user?.email ?? '?')}</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user?.fullName ?? user?.email ?? 'Usuario'}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r border-border bg-[var(--paper-card)] transition-[width] sm:flex',
            sidebarCollapsed ? 'w-14' : 'w-56',
          )}
        >
          <SidebarNav companyId={companyId} collapsed={sidebarCollapsed} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-64 p-0 sm:hidden">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <SidebarNav companyId={companyId} collapsed={false} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
