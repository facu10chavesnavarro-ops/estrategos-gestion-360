import { ItemsPageContent } from '@/components/catalogo/items-page-content';

export default async function ServiciosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <ItemsPageContent companyId={companyId} type="SERVICE" />;
}
