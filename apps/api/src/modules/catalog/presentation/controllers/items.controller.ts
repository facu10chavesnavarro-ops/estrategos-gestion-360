import { Body, Controller, Get, Header, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateItemUseCase } from '../../application/use-cases/create-item.use-case';
import { UpdateItemUseCase } from '../../application/use-cases/update-item.use-case';
import { GetItemByIdUseCase } from '../../application/use-cases/get-item-by-id.use-case';
import { ListItemsUseCase } from '../../application/use-cases/list-items.use-case';
import { DeactivateItemUseCase } from '../../application/use-cases/deactivate-item.use-case';
import { ActivateItemUseCase } from '../../application/use-cases/activate-item.use-case';
import { ImportItemsUseCase } from '../../application/use-cases/import-items.use-case';
import { ExportItemsUseCase } from '../../application/use-cases/export-items.use-case';
import { CreateItemRequestDto } from '../dto/create-item-request.dto';
import { UpdateItemRequestDto } from '../dto/update-item-request.dto';
import { ImportRequestDto } from '../../../../common/presentation/dto/import-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapCatalogError } from '../map-catalog-error';
import { ItemType } from '../../domain/entities/item.entity';

@ApiTags('Ítems')
@ApiBearerAuth()
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
    private readonly importItemsUseCase: ImportItemsUseCase,
    private readonly exportItemsUseCase: ExportItemsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar ítems (productos y servicios), con filtros' })
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

  // Antes de ':itemId' a propósito: con el mismo shape de ruta (un solo
  // segmento tras /items), Nest matchea en orden de declaración — si
  // ':itemId' fuera primero, "export" caería ahí en vez de acá.
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Exportar ítems a CSV, respetando los mismos filtros que el listado' })
  async export(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Res() res: Response,
    @Query('type') type?: ItemType,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    const csv = await this.exportItemsUseCase.execute({
      companyId: contextCompanyId,
      type,
      categoryId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
    res.setHeader('Content-Disposition', 'attachment; filename="items.csv"');
    res.send(csv);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar ítems en lote desde un CSV' })
  async import(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: ImportRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.importItemsUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        csvContent: body.csvContent,
        mode: body.mode ?? 'skip-new-only',
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Crear un ítem (producto o servicio)' })
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
  @ApiOperation({ summary: 'Obtener un ítem por id' })
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
  @ApiOperation({ summary: 'Actualizar un ítem' })
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
  @ApiOperation({ summary: 'Desactivar un ítem' })
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
  @ApiOperation({ summary: 'Reactivar un ítem' })
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
