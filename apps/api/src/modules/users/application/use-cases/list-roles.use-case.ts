import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { RoleEntity } from '../../domain/entities/role.entity';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<RoleEntity[]> {
    return this.roleRepository.findAll();
  }
}
