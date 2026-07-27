import { Injectable } from '@nestjs/common';
import { CompanyPaymentMethodAccount as PrismaCompanyPaymentMethodAccount } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { CompanyPaymentMethodAccountRepository } from '../../domain/repositories/company-payment-method-account.repository';
import { CompanyPaymentMethodAccountEntity } from '../../domain/entities/company-payment-method-account.entity';
import { PaymentDirection } from '../../../treasury/domain/entities/payment.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

function toDomain(raw: PrismaCompanyPaymentMethodAccount): CompanyPaymentMethodAccountEntity {
  return new CompanyPaymentMethodAccountEntity(
    raw.companyId,
    raw.paymentMethodId,
    raw.direction as PaymentDirection,
    raw.accountId,
  );
}

@Injectable()
export class PrismaCompanyPaymentMethodAccountRepository extends CompanyPaymentMethodAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async upsert(
    input: { companyId: string; paymentMethodId: string; direction: PaymentDirection; accountId: string },
    ctx?: TransactionContext,
  ): Promise<CompanyPaymentMethodAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).companyPaymentMethodAccount.upsert({
      where: {
        companyId_paymentMethodId_direction: {
          companyId: input.companyId,
          paymentMethodId: input.paymentMethodId,
          direction: input.direction,
        },
      },
      create: input,
      update: { accountId: input.accountId },
    });
    return toDomain(raw);
  }

  async find(
    companyId: string,
    paymentMethodId: string,
    direction: PaymentDirection,
    ctx?: TransactionContext,
  ): Promise<CompanyPaymentMethodAccountEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).companyPaymentMethodAccount.findUnique({
      where: {
        companyId_paymentMethodId_direction: { companyId, paymentMethodId, direction },
      },
    });
    return raw ? toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string): Promise<CompanyPaymentMethodAccountEntity[]> {
    const raws = await this.prisma.companyPaymentMethodAccount.findMany({ where: { companyId } });
    return raws.map(toDomain);
  }
}
