import { AppShell } from '@/components/layout/app-shell';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <AppShell companyId={companyId}>{children}</AppShell>;
}
