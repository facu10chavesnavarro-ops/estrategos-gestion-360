import { AppShell } from '@/components/layout/app-shell';

export default function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  return <AppShell companyId={params.companyId}>{children}</AppShell>;
}
