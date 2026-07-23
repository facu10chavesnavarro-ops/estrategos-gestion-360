import { Controller, Get } from '@nestjs/common';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly listRolesUseCase: ListRolesUseCase) {}

  @Get()
  async list() {
    return this.listRolesUseCase.execute();
  }
}
