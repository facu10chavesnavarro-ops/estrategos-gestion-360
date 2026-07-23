import { Injectable } from '@nestjs/common';
import { ImportRowProcessor } from '../../../common/domain/import/import-row-processor';
import { ImportRowValidationError } from '../../../common/domain/import/import-row-validation.error';
import { isValidTaxId } from '../../../common/domain/rules/tax-id.validator';
import { PartyRepository } from '../../parties/domain/repositories/party.repository';
import { CustomerRepository } from '../domain/repositories/customer.repository';
import { CustomerEntity } from '../domain/entities/customer.entity';

export interface CustomerImportRow {
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  creditLimit?: string;
}

/**
 * Única pieza específica de Clientes en la importación CSV — el resto vive
 * en el motor genérico (common/application/csv-import.engine.ts). Columnas
 * esperadas del CSV (encabezado exacto, sin tildes para evitar problemas de
 * codificación): legalName, taxId, taxCondition, email, phone, address,
 * contactName, notes, paymentTermDays, creditLimit. Solo legalName es
 * obligatoria.
 */
@Injectable()
export class CustomerImportRowProcessor
  implements ImportRowProcessor<CustomerImportRow, CustomerEntity>
{
  readonly entityType = 'Customer';

  constructor(
    private readonly partyRepository: PartyRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  parseRow(rawRow: Record<string, string>, rowNumber: number): CustomerImportRow {
    const legalName = rawRow.legalName?.trim();
    if (!legalName) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: falta "legalName".`);
    }

    const taxId = rawRow.taxId?.trim() || undefined;
    if (taxId && !isValidTaxId(taxId)) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: CUIT con formato inválido.`);
    }

    const creditLimit = rawRow.creditLimit?.trim() || undefined;
    if (creditLimit !== undefined && Number(creditLimit) < 0) {
      throw new ImportRowValidationError(
        `Fila ${rowNumber}: el límite de crédito no puede ser negativo.`,
      );
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
      creditLimit,
    };
  }

  async findExisting(
    row: CustomerImportRow,
    companyId: string,
  ): Promise<CustomerEntity | null> {
    if (!row.taxId) return null; // sin CUIT no hay forma de deduplicar
    const party = await this.partyRepository.findByTaxId(companyId, row.taxId);
    if (!party) return null;
    return this.customerRepository.findByPartyId(party.id);
  }

  async create(row: CustomerImportRow, companyId: string): Promise<CustomerEntity> {
    const existingParty = row.taxId
      ? await this.partyRepository.findByTaxId(companyId, row.taxId)
      : null;

    // RN-TER-13: si el Tercero ya existe (ej. ya es Proveedor), se reutiliza
    // tal cual — no se pisan sus datos con lo que trae la fila.
    const partyId = existingParty
      ? existingParty.id
      : (
          await this.partyRepository.create({
            companyId,
            legalName: row.legalName,
            taxId: row.taxId,
            taxCondition: row.taxCondition,
            email: row.email,
            phone: row.phone,
            address: row.address,
            contactName: row.contactName,
            notes: row.notes,
          })
        ).id;

    return this.customerRepository.create({
      partyId,
      companyId,
      paymentTermDays: row.paymentTermDays,
      creditLimit: row.creditLimit,
    });
  }

  async applyUpdate(
    existing: CustomerEntity,
    row: CustomerImportRow,
  ): Promise<{ entity: CustomerEntity; changedFields: string[] }> {
    const changedFields: string[] = [];
    const partyPatch: Record<string, unknown> = {};
    const customerPatch: Record<string, unknown> = {};

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
      customerPatch.paymentTermDays = row.paymentTermDays;
      changedFields.push('paymentTermDays');
    }
    if (row.creditLimit !== undefined && row.creditLimit !== existing.creditLimit) {
      customerPatch.creditLimit = row.creditLimit;
      changedFields.push('creditLimit');
    }

    if (Object.keys(partyPatch).length > 0) {
      await this.partyRepository.update(existing.partyId, partyPatch);
    }
    if (Object.keys(customerPatch).length > 0) {
      await this.customerRepository.update(existing.id, customerPatch);
    }

    const updated = await this.customerRepository.findById(
      existing.id,
      existing.companyId,
    );
    return { entity: updated!, changedFields };
  }

  getEntityId(entity: CustomerEntity): string {
    return entity.id;
  }
}
