import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreatePriceListUseCase } from '../../application/use-cases/create-price-list.use-case';
import { UpdatePriceListUseCase } from '../../application/use-cases/update-price-list.use-case';
import { ListPriceListsUseCase } from '../../application/use-cases/list-price-lists.use-case';
import { DeactivatePriceListUseCase } from '../../application/use-cases/deactivate-price-list.use-case';
import { ActivatePriceListUseCase } from '../../application/use-cases/activate-price-list.use-case';
import { ListPriceListItemsUseCase } from '../../application/use-cases/list-price-list-items.use-case';
import { SetPriceListItemUseCase } from '../../application/use-cases/set-price-list-item.use-case';
import { RemovePriceListItemUseCase } from '../../application/use-cases/remove-price-list-item.use-case';
import { CreatePriceListRequestDto } from '../dto/create-price-list-request.dto';
import { UpdatePriceListRequestDto } from '../dto/update-price-list-request.dto';
import { SetPriceListItemRequestDto } from '../dto/set-price-list-item-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapCatalogError } from '../map-catalog-error';

@ApiTags('Listas de precios')
@Controller('companies/:companyId/price-lists')
@UseGuards(CompanyContextGuard)
export class PriceListsController {
  constructor(
    private readonly createPriceListUseCase: CreatePriceListUseCase,
    private readonly updatePriceListUseCase: UpdatePriceListUseCase,
    private readonly listPriceListsUseCase: ListPriceListsUseCase,
    private readonly deactivatePriceListUseCase: DeactivatePriceListUseCase,
    private readonly activatePriceListUseCase: ActivatePriceListUseCase,
    private readonly listPriceListItemsUseCase: ListPriceListItemsUseCase,
    private readonly setPriceListItemUseCase: SetPriceListItemUseCase,
    private readonly removePriceListItemUseCase: RemovePriceListItemUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('isActive') isActive?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listPriceListsUseCase.execute({
      companyId: contextCompanyId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreatePriceListRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createPriceListUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Patch(':priceListId')
  async update(
    @Param('companyId') companyId: string,
    @Param('priceListId') priceListId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdatePriceListRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updatePriceListUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        priceListId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':priceListId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('priceListId') priceListId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivatePriceListUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        priceListId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':priceListId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('priceListId') priceListId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activatePriceListUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        priceListId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Get(':priceListId/items')
  async listItems(
    @Param('companyId') companyId: string,
    @Param('priceListId') priceListId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.listPriceListItemsUseCase.execute(priceListId, contextCompanyId);
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Put(':priceListId/items/:itemId')
  async setItem(
    @Param('companyId') companyId: string,
    @Param('priceListId') priceListId: string,
    @Param('itemId') itemId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: SetPriceListItemRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.setPriceListItemUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        priceListId,
        itemId,
        price: body.price,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Delete(':priceListId/items/:itemId')
  @HttpCode(204)
  async removeItem(
    @Param('companyId') companyId: string,
    @Param('priceListId') priceListId: string,
    @Param('itemId') itemId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      await this.removePriceListItemUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        priceListId,
        itemId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }
}
