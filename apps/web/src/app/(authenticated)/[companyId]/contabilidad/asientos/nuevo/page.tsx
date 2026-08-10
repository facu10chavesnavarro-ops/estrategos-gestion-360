'use client';

import { JournalEntryForm } from '@/components/contabilidad/journal-entry-form';

/** Alta de asiento manual (F8 §5.6). */
export default function NuevoAsientoPage({ params }: { params: { companyId: string } }) {
  return <JournalEntryForm companyId={params.companyId} />;
}
