import { ItemsPageContent } from '@/components/catalogo/items-page-content';

export default function ServiciosPage({ params }: { params: { companyId: string } }) {
  return <ItemsPageContent companyId={params.companyId} type="SERVICE" />;
}
