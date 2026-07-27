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
import { CashSessionRepository } from '../../domain/repositories/cash-session.repository';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { ApplyCustomerAccountMovementService } from '../services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../services/apply-supplier-account-movement.service';
import { ApplyCashMovementService } from '../services/apply-cash-movement.service';
import { ApplyBankMovementService } from '../services/apply-bank-movement.service';
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
  MissingCashSessionError,
  InvalidCashSessionError,
  MissingBankAccountError,
  InvalidBankAccountError,
} from '../../domain/errors/payment.errors';

/**
 * RN-PAY-01 a 10. `totalAmount` nunca se informa: se calcula sumando los
 * medios de pago (§0.1 de docs/sprint-3/04-tesoreria.md, mismo principio
 * que RN-VOU-09). Genera siempre un movimiento de cuenta corriente
 * (RN-CTA-04) y, desde Sprint 3.5, también un CashMovement/BankMovement
 * cuando algún medio lo requiere (RN-PAY-10).
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
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly applyCustomerAccountMovementService: ApplyCustomerAccountMovementService,
    private readonly applySupplierAccountMovementService: ApplySupplierAccountMovementService,
    private readonly applyCashMovementService: ApplyCashMovementService,
    private readonly applyBankMovementService: ApplyBankMovementService,
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
    let cashAmount = new Decimal(0);
    let bankAmount = new Decimal(0);
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
      if (method.requiresCashMovement) {
        cashAmount = cashAmount.plus(amount);
      }
      if (method.requiresBankMovement) {
        bankAmount = bankAmount.plus(amount);
      }
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

    // RN-PAY-10: valida cashSessionId/bankAccountId antes de escribir nada.
    // Nota: Decimal.isPositive() de decimal.js considera 0 como positivo
    // (solo excluye negativos) — se usa greaterThan(0) para "estrictamente > 0".
    if (cashAmount.greaterThan(0)) {
      if (!input.cashSessionId) {
        throw new MissingCashSessionError();
      }
      const cashSession = await this.cashSessionRepository.findById(
        input.cashSessionId,
        input.companyId,
      );
      if (!cashSession || !cashSession.isOpen) {
        throw new InvalidCashSessionError();
      }
    }
    if (bankAmount.greaterThan(0)) {
      if (!input.bankAccountId) {
        throw new MissingBankAccountError();
      }
      const bankAccount = await this.bankAccountRepository.findById(
        input.bankAccountId,
        input.companyId,
      );
      if (!bankAccount || !bankAccount.isActive) {
        throw new InvalidBankAccountError();
      }
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

      // RN-PAY-10 (§0.1): un único CashMovement/BankMovement por pago,
      // agrupado por requisito (no por medio individual).
      if (cashAmount.greaterThan(0)) {
        await this.applyCashMovementService.apply(
          {
            cashSessionId: input.cashSessionId as string,
            type: input.direction === 'COLLECTION' ? 'IN' : 'OUT',
            amount: cashAmount.toFixed(2),
            paymentId: payment.id,
          },
          ctx,
        );
      }
      if (bankAmount.greaterThan(0)) {
        await this.applyBankMovementService.apply(
          {
            bankAccountId: input.bankAccountId as string,
            type: input.direction === 'COLLECTION' ? 'DEPOSIT' : 'WITHDRAWAL',
            amount: bankAmount.toFixed(2),
            paymentId: payment.id,
            date: payment.date,
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
