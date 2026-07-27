import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CashRegisterRepository,
  CreateCashRegisterInput,
  UpdateCashRegisterInput,
} from '../../domain/repositories/cash-register.repository';
import { CashRegisterEntity } from '../../domain/entities/cash-register.entity';
import { CashRegisterMapper } from '../mappers/cash-register.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCashRegisterRepository extends CashRegisterRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateCashRegisterInput,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity> {
    const raw = await resolveClient(this.prisma, ctx).cashRegister.create({
      data: { companyId: input.companyId, branchId: input.branchId, name: input.name },
    });
    return CashRegisterMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).cashRegister.findFirst({
      where: { id, companyId },
    });
    return raw ? CashRegisterMapper.toDomain(raw) : null;
  }

  async findAllByBranch(branchId: string): Promise<CashRegisterEntity[]> {
    const raws = await this.prisma.cashRegister.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });
    return raws.map(CashRegisterMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateCashRegisterInput,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity> {
    const raw = await resolveClient(this.prisma, ctx).cashRegister.update({
      where: { id },
      data: input,
    });
    return CashRegisterMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity> {
    const raw = await resolveClient(this.prisma, ctx).cashRegister.update({
      where: { id },
      data: { isActive },
    });
    return CashRegisterMapper.toDomain(raw);
  }
}
