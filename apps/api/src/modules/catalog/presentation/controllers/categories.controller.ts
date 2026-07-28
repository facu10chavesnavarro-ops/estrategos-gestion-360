import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { GetCategoryByIdUseCase } from '../../application/use-cases/get-category-by-id.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { DeactivateCategoryUseCase } from '../../application/use-cases/deactivate-category.use-case';
import { ActivateCategoryUseCase } from '../../application/use-cases/activate-category.use-case';
import { CreateCategoryRequestDto } from '../dto/create-category-request.dto';
import { UpdateCategoryRequestDto } from '../dto/update-category-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapCatalogError } from '../map-catalog-error';

@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('companies/:companyId/categories')
@UseGuards(CompanyContextGuard)
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly getCategoryByIdUseCase: GetCategoryByIdUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly deactivateCategoryUseCase: DeactivateCategoryUseCase,
    private readonly activateCategoryUseCase: ActivateCategoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías de catálogo' })
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('isActive') isActive?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listCategoriesUseCase.execute({
      companyId: contextCompanyId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Post()
  @ApiOperation({ summary: 'Crear una categoría (opcionalmente con padre)' })
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateCategoryRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createCategoryUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Obtener una categoría por id' })
  async getById(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getCategoryByIdUseCase.execute(categoryId, contextCompanyId);
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Patch(':categoryId')
  @ApiOperation({
    summary: 'Actualizar una categoría',
    description:
      'Incluye el mapeo contable opcional (salesAccountId/purchasesAccountId, Sprint 4) ' +
      'usado por el motor de asientos automáticos.',
  })
  async update(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateCategoryRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateCategoryUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        categoryId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':categoryId/deactivate')
  @ApiOperation({ summary: 'Desactivar una categoría' })
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateCategoryUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        categoryId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':categoryId/activate')
  @ApiOperation({ summary: 'Reactivar una categoría' })
  async activate(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateCategoryUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        categoryId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }
}
