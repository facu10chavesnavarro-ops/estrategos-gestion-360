import { TransactionContext } from '../transaction/transaction-context';

export interface AuditLogEntry {
  companyId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/** RN-009: registro inmutable de acciones sensibles. Solo se escribe, nunca se edita. */
export abstract class AuditLogRepository {
  abstract record(entry: AuditLogEntry, ctx?: TransactionContext): Promise<void>;
}
