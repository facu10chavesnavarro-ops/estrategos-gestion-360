import { Branch as PrismaBranch } from '@prisma/client';
import { BranchEntity } from '../../domain/entities/branch.entity';

export class BranchMapper {
  static toDomain(raw: PrismaBranch): BranchEntity {
    return new BranchEntity(
      raw.id,
      raw.companyId,
      raw.name,
      raw.address,
      raw.phone,
      raw.isActive,
    );
  }
}
