import { Injectable } from '@nestjs/common';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { PartyRepository } from '../../../parties/domain/repositories/party.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { isValidTaxId } from '../../../../common/domain/rules/tax-id.validator';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { CreateSupplierUseCaseInput } from '../dto/supplier.dto';
import { DuplicateSupplierError, InvalidTaxIdError } from '../../domain/errors/supplier.errors';

/** RN-TER-06/07/12/13. */
@Injectable()
export class CreateSupplierUseCase {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly partyRepository: PartyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateSupplierUseCaseInput): Promise<SupplierEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (input.taxId && !isValidTaxId(input.taxId)) {
      throw new InvalidTaxIdError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const partyId = await this.resolvePartyId(input, ctx);

      const supplier = await this.supplierRepository.create(
        {
          partyId,
          companyId: input.companyId,
          paymentTermDays: input.paymentTermDays,
          bankName: input.bankName,
          bankAccountHolder: input.bankAccountHolder,
          bankCbu: input.bankCbu,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'supplier.create',
          entityType: 'Supplier',
          entityId: supplier.id,
          metadata: { legalName: supplier.legalName },
        },
        ctx,
      );

      return supplier;
    });
  }

  private async resolvePartyId(
    input: CreateSupplierUseCaseInput,
    ctx: TransactionContext,
  ): Promise<string> {
    if (input.taxId) {
      const existingParty = await this.partyRepository.findByTaxId(
        input.companyId,
        input.taxId,
        ctx,
      );
      if (existingParty) {
        const existingSupplier = await this.supplierRepository.findByPartyId(
          existingParty.id,
          ctx,
        );
        if (existingSupplier) {
          throw new DuplicateSupplierError();
        }
        return existingParty.id;
      }
      const party = await this.partyRepository.create(
        {
          companyId: input.companyId,
          legalName: input.legalName,
          taxId: input.taxId,
          taxCondition: input.taxCondition,
          email: input.email,
          phone: input.phone,
          address: input.address,
          contactName: input.contactName,
          notes: input.notes,
        },
        ctx,
      );
      return party.id;
    }

    const party = await this.partyRepository.create(
      {
        companyId: input.companyId,
        legalName: input.legalName,
        taxCondition: input.taxCondition,
        email: input.email,
        phone: input.phone,
        address: input.address,
        contactName: input.contactName,
        notes: input.notes,
      },
      ctx,
    );
    return party.id;
  }
}
