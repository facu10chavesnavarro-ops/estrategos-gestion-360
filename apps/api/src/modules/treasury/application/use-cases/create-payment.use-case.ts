import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PaymentMethodRepository } from '../../domain/repositories/payment-method.repository';
import {
  PaymentRepository,
  CreatePaymentMethodDetailInput as RepositoryMethodDetailInput,
  CreatePaymentAllocationInput as RepositoryAllocationInput,
} from '../../domain/repositories/payment.repository';
import { CustomerRepository } from '../../../customers/domain/repositories/customer.repository';
import { SupplierRepository } from '../../../suppliers/domain/repositories/supplier.repository';
import { VoucherRepository } from '../../../vouchers/domain/repositories/voucher.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { ApplyCustomerAccountMovementService } from '../services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../services/apply-supplier-account-movement.service';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { CreatePaymentUseCaseInput } from '../dto/payment.dto';
import {
  InvalidPaymentCounterpartyError,
  EmptyPaymentMethodDetailsError,
  InvalidPaymentMethodError,
  MissingCheckDetailError,
  AllocationExceedsPaymentAmountError,
  InvalidAllocationVoucherError,
  VoucherOverpaidError,
} from '../../domain/errors/payment.errors';

/**
 * RN-PAY-01 a 09. `totalAmount` nunca se informa: se calcula sumando los
 * medios de pago (§0.1 de docs/sprint-3/04-tesoreria.md, mismo principio
 * que RN-VOU-09). Genera siempre un movimiento de cuenta corriente
 * (RN-CTA-04); no genera todavía CashMovement/BankMovement (§0.2, diferido
 * a Sprint 3.5).
 */
@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly voucherRepository: VoucherRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly applyCustomerAccountMovementService: ApplyCustomerAccountMovementService,
    private readonly applySupplierAccountMovementService: ApplySupplierAccountMovementService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreatePaymentUseCaseInput): Promise<PaymentEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (!input.methodDetails || input.methodDetails.length === 0) {
      throw new EmptyPaymentMethodDetailsError();
    }

    const company = await this.companyRepository.findById(input.companyId);

    let customerId: string | undefined;
    let supplierId: string | undefined;
    if (input.direction === 'COLLECTION') {
      const customer = await this.customerRepository.findByPartyId(input.partyId);
      if (!customer || customer.companyId !== input.companyId || !customer.isActive) {
        throw new InvalidPaymentCounterpartyError();
      }
      customerId = customer.id;
    } else {
      const supplier = await this.supplierRepository.findByPartyId(input.partyId);
      if (!supplier || supplier.companyId !== input.companyId || !supplier.isActive) {
        throw new InvalidPaymentCounterpartyError();
      }
      supplierId = supplier.id;
    }

    // RN-PAY-07: valida el medio y exige CheckDetail cuando corresponde.
    const methodDetailsToCreate: RepositoryMethodDetailInput[] = [];
    let totalAmount = new Decimal(0);
    for (const detail of input.methodDetails) {
      const method = await this.paymentMethodRepository.findById(detail.paymentMethodId);
      if (!method || !method.isActive) {
        throw new InvalidPaymentMethodError();
      }
      if (method.requiresCheckDetail && !detail.checkDetail) {
        throw new MissingCheckDetailError();
      }
      const amount = new Decimal(detail.amount);
      totalAmount = totalAmount.plus(amount);
      methodDetailsToCreate.push({
        id: uuidv7(),
        paymentMethodId: detail.paymentMethodId,
        amount: amount.toFixed(2),
        reference: detail.reference,
        checkDetail: detail.checkDetail
          ? {
              number: detail.checkDetail.number,
              bankName: detail.checkDetail.bankName,
              dueDate: new Date(detail.checkDetail.dueDate),
            }
          : undefined,
        cardDetail: detail.cardDetail,
      });
    }

    // RN-PAY-03/04/05: valida las imputaciones antes de escribir nada.
    const allocationsToCreate: RepositoryAllocationInput[] = [];
    if (input.allocations && input.allocations.length > 0) {
      let allocatedFromThisPayment = new Decimal(0);
      for (const allocation of input.allocations) {
        const voucher = await this.voucherRepository.findById(allocation.voucherId, input.companyId);
        if (!voucher || voucher.partyId !== input.partyId) {
          throw new InvalidAllocationVoucherError();
        }
        const amountApplied = new Decimal(allocation.amountApplied);
        allocatedFromThisPayment = allocatedFromThisPayment.plus(amountApplied);

        const alreadyAllocated = new Decimal(
          await this.paymentRepository.sumAllocatedAmountForVoucher(allocation.voucherId),
        );
        if (alreadyAllocated.plus(amountApplied).greaterThan(new Decimal(voucher.total))) {
          throw new VoucherOverpaidError();
        }

        allocationsToCreate.push({
          id: uuidv7(),
          voucherId: allocation.voucherId,
          amountApplied: amountApplied.toFixed(2),
        });
      }
      if (allocatedFromThisPayment.greaterThan(totalAmount)) {
        throw new AllocationExceedsPaymentAmountError();
      }
    }

    return this.unitOfWork.run(async (ctx) => {
      const payment = await this.paymentRepository.create(
        {
          id: uuidv7(),
          companyId: input.companyId,
          partyId: input.partyId,
          direction: input.direction,
          date: input.date ? new Date(input.date) : new Date(),
          currency: input.currency ?? company?.currency ?? 'ARS',
          exchangeRate: input.exchangeRate ?? '1',
          totalAmount: totalAmount.toFixed(2),
          createdByUserId: input.requestingUserId,
          allocations: allocationsToCreate,
          methodDetails: methodDetailsToCreate,
        },
        ctx,
      );

      // RN-CTA-04 (§0.3): COLLECTION reduce lo que nos debe el cliente (CREDIT);
      // PAYMENT reduce lo que le debemos al proveedor (DEBIT).
      if (customerId) {
        await this.applyCustomerAccountMovementService.apply(
          {
            companyId: input.companyId,
            customerId,
            type: 'CREDIT',
            amount: payment.totalAmount,
            paymentId: payment.id,
          },
          ctx,
        );
      } else if (supplierId) {
        await this.applySupplierAccountMovementService.apply(
          {
            companyId: input.companyId,
            supplierId,
            type: 'DEBIT',
            amount: payment.totalAmount,
            paymentId: payment.id,
          },
          ctx,
        );
      }

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'payment.create',
          entityType: 'Payment',
          entityId: payment.id,
          metadata: {
            direction: payment.direction,
            partyId: payment.partyId,
            totalAmount: payment.totalAmount,
          },
        },
        ctx,
      );

      return payment;
    });
  }
}
