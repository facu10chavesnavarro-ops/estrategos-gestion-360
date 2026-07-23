export type ImportMode = 'skip-new-only' | 'update-existing' | 'skip-silently';

export type ImportRowOutcome = 'created' | 'updated' | 'skipped-duplicate' | 'rejected';

export interface ImportRowResult {
  row: number;
  outcome: ImportRowOutcome;
  entityId?: string;
  changedFields?: string[];
  reason?: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  skippedDuplicates: number;
  rejected: Array<{ row: number; reason: string }>;
}

export function summarize(results: ImportRowResult[]): ImportSummary {
  return {
    totalRows: results.length,
    created: results.filter((r) => r.outcome === 'created').length,
    updated: results.filter((r) => r.outcome === 'updated').length,
    skippedDuplicates: results.filter((r) => r.outcome === 'skipped-duplicate').length,
    rejected: results
      .filter((r) => r.outcome === 'rejected')
      .map((r) => ({ row: r.row, reason: r.reason ?? 'Error desconocido' })),
  };
}
