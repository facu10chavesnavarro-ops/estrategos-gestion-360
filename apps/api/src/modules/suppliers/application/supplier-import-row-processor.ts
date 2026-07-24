import { Injectable } from '@nestjs/common';
import { ImportRowProcessor } from '../../../common/domain/import/import-row-processor';
import { ImportRowValidationError } from '../../../common/domain/import/import-row-validation.error';
import { isValidTaxId } from '../../../common/domain/rules/tax-id.validator';
import { TransactionContext } from '../../../common/domain/transaction/transaction-context';
import { PartyRepository } from '../../parties/domain/repositories/party.repository';
import { SupplierRepository } from '../domain/repositories/supplier.repository';
import { SupplierEntity } from '../domain/entities/supplier.entity';

export interface SupplierImportRow {
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  bankName?: string;
  bankAccountHolder?: string;
  bankCbu?: string;
}

/**
 * Única pieza específica de Proveedores en la importación CSV. Columnas
 * esperadas: legalName, taxId, taxCondition, email, phone, address,
 * contactName, notes, paymentTermDays, bankName, bankAccountHolder, bankCbu.
 * Solo legalName es obligatoria.
 */
@Injectable()
export class SupplierImportRowProcessor
  implements ImportRowProcessor<SupplierImportRow, SupplierEntity>
{
  readonly entityType = 'Supplier';

  constructor(
    private readonly partyRepository: PartyRepository,
    private readonly supplierRepository: SupplierRepository,
  ) {}

  parseRow(rawRow: Record<string, string>, rowNumber: number): SupplierImportRow {
    const legalName = rawRow.legalName?.trim();
    if (!legalName) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: falta "legalName".`);
    }

    const taxId = rawRow.taxId?.trim() || undefined;
    if (taxId && !isValidTaxId(taxId)) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: CUIT con formato inválido.`);
    }

    const paymentTermDaysRaw = rawRow.paymentTermDays?.trim();
    const paymentTermDays = paymentTermDaysRaw ? Number(paymentTermDaysRaw) : undefined;
    if (
      paymentTermDays !== undefined &&
      (Number.isNaN(paymentTermDays) || paymentTermDays < 0)
    ) {
      throw new ImportRowValidationError(
        `Fila ${rowNumber}: "paymentTermDays" debe ser un número no negativo.`,
      );
    }

    return {
      legalName,
      taxId,
      taxCondition: rawRow.taxCondition?.trim() || undefined,
      email: rawRow.email?.trim() || undefined,
      phone: rawRow.phone?.trim() || undefined,
      address: rawRow.address?.trim() || undefined,
      contactName: rawRow.contactName?.trim() || undefined,
      notes: rawRow.notes?.trim() || undefined,
      paymentTermDays,
      bankName: rawRow.bankName?.trim() || undefined,
      bankAccountHolder: rawRow.bankAccountHolder?.trim() || undefined,
      bankCbu: rawRow.bankCbu?.trim() || undefined,
    };
  }

  async findExisting(
    row: SupplierImportRow,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity | null> {
    if (!row.taxId) return null;
    const party = await this.partyRepository.findByTaxId(companyId, row.taxId, ctx);
    if (!party) return null;
    return this.supplierRepository.findByPartyId(party.id, ctx);
  }

  async create(
    row: SupplierImportRow,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity> {
    const existingParty = row.taxId
      ? await this.partyRepository.findByTaxId(companyId, row.taxId, ctx)
      : null;

    const partyId = existingParty
      ? existingParty.id
      : (
          await this.partyRepository.create(
            {
              companyId,
              legalName: row.legalName,
              taxId: row.taxId,
              taxCondition: row.taxCondition,
              email: row.email,
              phone: row.phone,
              address: row.address,
              contactName: row.contactName,
              notes: row.notes,
            },
            ctx,
          )
        ).id;

    return this.supplierRepository.create(
      {
        partyId,
        companyId,
        paymentTermDays: row.paymentTermDays,
        bankName: row.bankName,
        bankAccountHolder: row.bankAccountHolder,
        bankCbu: row.bankCbu,
      },
      ctx,
    );
  }

  async applyUpdate(
    existing: SupplierEntity,
    row: SupplierImportRow,
    ctx?: TransactionContext,
  ): Promise<{ entity: SupplierEntity; changedFields: string[] }> {
    const changedFields: string[] = [];
    const partyPatch: Record<string, unknown> = {};
    const supplierPatch: Record<string, unknown> = {};

    if (row.legalName !== existing.legalName) {
      partyPatch.legalName = row.legalName;
      changedFields.push('legalName');
    }
    for (const field of ['taxCondition', 'email', 'phone', 'address', 'contactName', 'notes'] as const) {
      if (row[field] !== undefined && row[field] !== existing[field]) {
        partyPatch[field] = row[field];
        changedFields.push(field);
      }
    }
    if (row.paymentTermDays !== undefined && row.paymentTermDays !== existing.paymentTermDays) {
      supplierPatch.paymentTermDays = row.paymentTermDays;
      changedFields.push('paymentTermDays');
    }
    for (const field of ['bankName', 'bankAccountHolder', 'bankCbu'] as const) {
      if (row[field] !== undefined && row[field] !== existing[field]) {
        supplierPatch[field] = row[field];
        changedFields.push(field);
      }
    }

    if (Object.keys(partyPatch).length > 0) {
      await this.partyRepository.update(existing.partyId, partyPatch, ctx);
    }
    if (Object.keys(supplierPatch).length > 0) {
      await this.supplierRepository.update(existing.id, supplierPatch, ctx);
    }

    const updated = await this.supplierRepository.findById(
      existing.id,
      existing.companyId,
      ctx,
    );
    return { entity: updated!, changedFields };
  }

  getEntityId(entity: SupplierEntity): string {
    return entity.id;
  }
}
