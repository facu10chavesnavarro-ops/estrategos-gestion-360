'use client';

import { use } from 'react';
import { JournalEntryForm } from '@/components/contabilidad/journal-entry-form';

/** Alta de asiento manual (F8 §5.6). */
export default function NuevoAsientoPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  return <JournalEntryForm companyId={companyId} />;
}
