import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateItemUseCase } from '../../application/use-cases/create-item.use-case';
import { UpdateItemUseCase } from '../../application/use-cases/update-item.use-case';
import { GetItemByIdUseCase } from '../../application/use-cases/get-item-by-id.use-case';
import { ListItemsUseCase } from '../../application/use-cases/list-items.use-case';
import { DeactivateItemUseCase } from '../../application/use-cases/deactivate-item.use-case';
import { ActivateItemUseCase } from '../../application/use-cases/activate-item.use-case';
import { CreateItemRequestDto } from '../dto/create-item-request.dto';
import { UpdateItemRequestDto } from '../dto/update-item-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapCatalogError } from '../map-catalog-error';
import { ItemType } from '../../domain/entities/item.entity';

@ApiTags('Ítems')
@Controller('companies/:companyId/items')
@UseGuards(CompanyContextGuard)
export class ItemsController {
  constructor(
    private readonly createItemUseCase: CreateItemUseCase,
    private readonly updateItemUseCase: UpdateItemUseCase,
    private readonly getItemByIdUseCase: GetItemByIdUseCase,
    private readonly listItemsUseCase: ListItemsUseCase,
    private readonly deactivateItemUseCase: DeactivateItemUseCase,
    private readonly activateItemUseCase: ActivateItemUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('type') type?: ItemType,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listItemsUseCase.execute({
      companyId: contextCompanyId,
      type,
      categoryId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateItemRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createItemUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Get(':itemId')
  async getById(
    @Param('companyId') companyId: string,
    @Param('itemId') itemId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getItemByIdUseCase.execute(itemId, contextCompanyId);
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Patch(':itemId')
  async update(
    @Param('companyId') companyId: string,
    @Param('itemId') itemId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateItemRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateItemUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        itemId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':itemId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('itemId') itemId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateItemUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        itemId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':itemId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('itemId') itemId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateItemUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        itemId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }
}
