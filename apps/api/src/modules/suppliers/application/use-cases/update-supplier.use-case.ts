import { Injectable } from '@nestjs/common';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { PartyRepository } from '../../../parties/domain/repositories/party.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { isValidTaxId } from '../../../../common/domain/rules/tax-id.validator';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { UpdateSupplierUseCaseInput } from '../dto/supplier.dto';
import { SupplierNotFoundError, InvalidTaxIdError } from '../../domain/errors/supplier.errors';
import { pick } from '../../../../common/application/pick';

const PARTY_FIELDS = [
  'legalName',
  'taxId',
  'taxCondition',
  'email',
  'phone',
  'address',
  'contactName',
  'notes',
] as const;
const SUPPLIER_FIELDS = ['paymentTermDays', 'bankName', 'bankAccountHolder', 'bankCbu'] as const;

/** RN-TER-06/12/14. */
@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly partyRepository: PartyRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateSupplierUseCaseInput): Promise<SupplierEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const supplier = await this.supplierRepository.findById(
      input.supplierId,
      input.companyId,
    );
    if (!supplier) {
      throw new SupplierNotFoundError();
    }
    if (input.taxId && !isValidTaxId(input.taxId)) {
      throw new InvalidTaxIdError();
    }

    const partyPatch = pick(input, PARTY_FIELDS);
    const supplierPatch = pick(input, SUPPLIER_FIELDS);

    if (Object.keys(partyPatch).length > 0) {
      await this.partyRepository.update(supplier.partyId, partyPatch);
    }
    if (Object.keys(supplierPatch).length > 0) {
      await this.supplierRepository.update(supplier.id, supplierPatch);
    }

    const result = await this.supplierRepository.findById(
      supplier.id,
      input.companyId,
    );

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'supplier.update',
      entityType: 'Supplier',
      entityId: supplier.id,
      metadata: { fields: [...Object.keys(partyPatch), ...Object.keys(supplierPatch)] },
    });

    return result!;
  }
}
