import { ItemsPageContent } from '@/components/catalogo/items-page-content';

export default function ProductosPage({ params }: { params: { companyId: string } }) {
  return <ItemsPageContent companyId={params.companyId} type="PRODUCT" />;
}
