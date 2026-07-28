import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateManualJournalEntryUseCase } from '../../application/use-cases/create-manual-journal-entry.use-case';
import { ListJournalEntriesUseCase } from '../../application/use-cases/list-journal-entries.use-case';
import { GetJournalEntryByIdUseCase } from '../../application/use-cases/get-journal-entry-by-id.use-case';
import { ReverseJournalEntryUseCase } from '../../application/use-cases/reverse-journal-entry.use-case';
import { CreateManualJournalEntryRequestDto } from '../dto/create-manual-journal-entry-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapAccountingError } from '../map-accounting-error';

/** Libro Diario (§5): listado cronológico de asientos por empresa. */
@ApiTags('Contabilidad')
@ApiBearerAuth()
@Controller('companies/:companyId/journal-entries')
@UseGuards(CompanyContextGuard)
export class JournalEntriesController {
  constructor(
    private readonly createManualJournalEntryUseCase: CreateManualJournalEntryUseCase,
    private readonly listJournalEntriesUseCase: ListJournalEntriesUseCase,
    private readonly getJournalEntryByIdUseCase: GetJournalEntryByIdUseCase,
    private readonly reverseJournalEntryUseCase: ReverseJournalEntryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Libro Diario: listar los asientos de la empresa por rango de fechas' })
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listJournalEntriesUseCase.execute({ companyId: contextCompanyId, from, to });
  }

  @Post()
  @ApiOperation({
    summary: 'Crear un asiento manual',
    description: 'Debe balancear (Σ debit = Σ credit) y cada cuenta debe ser imputable.',
  })
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateManualJournalEntryRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createManualJournalEntryUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Get(':journalEntryId')
  @ApiOperation({ summary: 'Obtener un asiento por id, con sus líneas' })
  async getById(
    @Param('companyId') companyId: string,
    @Param('journalEntryId') journalEntryId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getJournalEntryByIdUseCase.execute(journalEntryId, contextCompanyId);
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Post(':journalEntryId/reverse')
  @ApiOperation({
    summary: 'Revertir un asiento',
    description:
      'Los asientos son inmutables: la corrección es un nuevo asiento que ' +
      'invierte débitos y créditos del original. Rechaza si ya fue revertido.',
  })
  async reverse(
    @Param('companyId') companyId: string,
    @Param('journalEntryId') journalEntryId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.reverseJournalEntryUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        journalEntryId,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }
}
