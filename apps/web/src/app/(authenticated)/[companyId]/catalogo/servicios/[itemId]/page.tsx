import { ItemDetailContent } from '@/components/catalogo/item-detail-content';

export default function ServicioDetailPage({
  params,
}: {
  params: { companyId: string; itemId: string };
}) {
  return <ItemDetailContent companyId={params.companyId} itemId={params.itemId} type="SERVICE" />;
}
