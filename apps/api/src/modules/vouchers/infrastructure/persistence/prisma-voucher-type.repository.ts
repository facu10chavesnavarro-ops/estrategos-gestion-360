import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { VoucherTypeRepository } from '../../domain/repositories/voucher-type.repository';
import { VoucherTypeEntity } from '../../domain/entities/voucher-type.entity';
import { VoucherTypeMapper } from '../mappers/voucher-type.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaVoucherTypeRepository extends VoucherTypeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string, ctx?: TransactionContext): Promise<VoucherTypeEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).voucherType.findUnique({ where: { id } });
    return raw ? VoucherTypeMapper.toDomain(raw) : null;
  }

  async findByCode(code: string): Promise<VoucherTypeEntity | null> {
    const raw = await this.prisma.voucherType.findUnique({ where: { code } });
    return raw ? VoucherTypeMapper.toDomain(raw) : null;
  }

  async findAllActive(): Promise<VoucherTypeEntity[]> {
    const raws = await this.prisma.voucherType.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return raws.map(VoucherTypeMapper.toDomain);
  }
}
