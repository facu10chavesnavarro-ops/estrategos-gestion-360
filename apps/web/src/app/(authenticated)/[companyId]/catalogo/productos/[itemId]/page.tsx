import { ItemDetailContent } from '@/components/catalogo/item-detail-content';

export default function ProductoDetailPage({
  params,
}: {
  params: { companyId: string; itemId: string };
}) {
  return <ItemDetailContent companyId={params.companyId} itemId={params.itemId} type="PRODUCT" />;
}
