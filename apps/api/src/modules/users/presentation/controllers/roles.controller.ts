import { Controller, Get } from '@nestjs/common';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly listRolesUseCase: ListRolesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo global de roles asignables' })
  async list() {
    return this.listRolesUseCase.execute();
  }
}
