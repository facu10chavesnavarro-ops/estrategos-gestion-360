import { ItemDetailContent } from '@/components/catalogo/item-detail-content';

export default async function ServicioDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; itemId: string }>;
}) {
  const { companyId, itemId } = await params;
  return <ItemDetailContent companyId={companyId} itemId={itemId} type="SERVICE" />;
}
