import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { UnitOfWork } from '../../domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../domain/transaction/transaction-context';

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx as unknown as TransactionContext));
  }
}
