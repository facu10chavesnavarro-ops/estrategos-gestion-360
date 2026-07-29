'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { useMyCompanies } from '@/lib/api/companies';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CompanySwitcher({ companyId }: { companyId: string }) {
  const router = useRouter();
  const { data: companies } = useMyCompanies();
  const current = companies?.find((c) => c.id === companyId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="max-w-[220px] justify-between gap-2 px-2">
            <span className="truncate">{current?.legalName ?? 'Empresa'}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        {companies?.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => {
              if (company.id !== companyId) {
                router.push(`/${company.id}/inicio`);
              }
            }}
          >
            {company.id === companyId && <Check className="size-3.5" />}
            <span className={company.id === companyId ? '' : 'pl-[18px]'}>
              {company.legalName}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
