import { RoleEntity } from '../entities/role.entity';

export abstract class RoleRepository {
  abstract findAll(): Promise<RoleEntity[]>;
  abstract findById(id: string): Promise<RoleEntity | null>;
}
