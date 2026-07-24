import { RoleEntity } from '../entities/role.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export abstract class RoleRepository {
  abstract findAll(): Promise<RoleEntity[]>;
  abstract findById(id: string, ctx?: TransactionContext): Promise<RoleEntity | null>;
}
