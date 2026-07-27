import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { VoucherTypeRepository } from '../../domain/repositories/voucher-type.repository';
import { PointOfSaleRepository } from '../../domain/repositories/point-of-sale.repository';
import { VoucherCounterRepository } from '../../domain/repositories/voucher-counter.repository';
import {
  VoucherRepository,
  CreateVoucherLineInput as RepositoryVoucherLineInput,
} from '../../domain/repositories/voucher.repository';
import { CustomerRepository } from '../../../customers/domain/repositories/customer.repository';
import { SupplierRepository } from '../../../suppliers/domain/repositories/supplier.repository';
import { ItemRepository } from '../../../catalog/domain/repositories/item.repository';
import { TaxRepository } from '../../../catalog/domain/repositories/tax.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { ApplyStockMovementService } from '../../../inventory/application/services/apply-stock-movement.service';
import { StockMovementType } from '../../../inventory/domain/entities/stock-movement.entity';
import { ApplyCustomerAccountMovementService } from '../../../treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../../treasury/application/services/apply-supplier-account-movement.service';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';
import { VoucherEntity } from '../../domain/entities/voucher.entity';
import { VoucherTypeEntity } from '../../domain/entities/voucher-type.entity';
import { CreateVoucherUseCaseInput } from '../dto/voucher.dto';
import {
  VoucherTypeNotFoundError,
  InvalidVoucherPointOfSaleError,
  InvalidCounterpartyError,
  MissingRelatedVoucherError,
  InvalidRelatedVoucherError,
  MissingWarehouseError,
  EmptyVoucherLinesError,
  InvalidVoucherLineItemError,
  InvalidVoucherLineQuantityError,
} from '../../domain/errors/voucher.errors';

function resolveStockMovementType(voucherType: VoucherTypeEntity): StockMovementType {
  if (voucherType.isCreditNote) {
    return voucherType.affectsStock === 'IN' ? 'RETURN_IN' : 'RETURN_OUT';
  }
  return voucherType.flow === 'SALE' ? 'SALE_OUT' : 'PURCHASE_IN';
}

function isTaxCurrentlyValid(validFrom: Date, validTo: Date | null, now: Date): boolean {
  return validFrom <= now && (validTo === null || validTo > now);
}

/**
 * RN-VOU-01 a 12. Crear = confirmar en una sola operación (§0.2 del
 * documento de diseño): numera, calcula totales, snapshotea impuestos y
 * aplica los efectos de stock, todo dentro de la misma transacción vía
 * `ApplyStockMovementService` (§0.3) para que un fallo en cualquier paso
 * revierta también el número ya reservado.
 */
@Injectable()
export class CreateVoucherUseCase {
  constructor(
    private readonly voucherTypeRepository: VoucherTypeRepository,
    private readonly pointOfSaleRepository: PointOfSaleRepository,
    private readonly voucherCounterRepository: VoucherCounterRepository,
    private readonly voucherRepository: VoucherRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly itemRepository: ItemRepository,
    private readonly taxRepository: TaxRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly applyStockMovementService: ApplyStockMovementService,
    private readonly applyCustomerAccountMovementService: ApplyCustomerAccountMovementService,
    private readonly applySupplierAccountMovementService: ApplySupplierAccountMovementService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateVoucherUseCaseInput): Promise<VoucherEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (!input.lines || input.lines.length === 0) {
      throw new EmptyVoucherLinesError();
    }
    for (const line of input.lines) {
      // Decimal.isPositive() de decimal.js incluye 0 (solo excluye
      // negativos) — se usa greaterThan(0) para "estrictamente > 0".
      if (!(new Decimal(line.quantity).greaterThan(0))) {
        throw new InvalidVoucherLineQuantityError();
      }
    }

    const voucherType = await this.voucherTypeRepository.findById(input.voucherTypeId);
    if (!voucherType || !voucherType.isActive) {
      throw new VoucherTypeNotFoundError();
    }

    const pointOfSale = await this.pointOfSaleRepository.findById(
      input.pointOfSaleId,
      input.companyId,
    );
    if (!pointOfSale || pointOfSale.branchId !== input.branchId) {
      throw new InvalidVoucherPointOfSaleError();
    }

    const company = await this.companyRepository.findById(input.companyId);

    let customerId: string | undefined;
    let supplierId: string | undefined;
    if (voucherType.flow === 'SALE') {
      const customer = await this.customerRepository.findByPartyId(input.partyId);
      if (!customer || customer.companyId !== input.companyId || !customer.isActive) {
        throw new InvalidCounterpartyError();
      }
      customerId = customer.id;
    } else {
      const supplier = await this.supplierRepository.findByPartyId(input.partyId);
      if (!supplier || supplier.companyId !== input.companyId || !supplier.isActive) {
        throw new InvalidCounterpartyError();
      }
      supplierId = supplier.id;
    }

    if (voucherType.relatedVoucherRequired) {
      if (!input.relatedVoucherId) {
        throw new MissingRelatedVoucherError();
      }
      const relatedVoucher = await this.voucherRepository.findById(
        input.relatedVoucherId,
        input.companyId,
      );
      if (!relatedVoucher || relatedVoucher.partyId !== input.partyId) {
        throw new InvalidRelatedVoucherError();
      }
    }

    const now = new Date();

    // RN-VOU-05: resuelve ítem + impuestos vigentes por línea, antes de tocar la DB en escritura.
    const resolvedLines = await Promise.all(
      input.lines.map(async (line) => {
        if (!line.itemId) {
          return { line, item: null, taxes: [] as { taxId: string; rate: string }[] };
        }
        const item = await this.itemRepository.findById(line.itemId, input.companyId);
        if (!item) {
          throw new InvalidVoucherLineItemError();
        }
        const taxes = (
          await Promise.all(
            item.taxIds.map((taxId) => this.taxRepository.findById(taxId, input.companyId)),
          )
        ).filter(
          (tax): tax is NonNullable<typeof tax> =>
            tax !== null && isTaxCurrentlyValid(tax.validFrom, tax.validTo, now),
        );
        return { line, item, taxes: taxes.map((tax) => ({ taxId: tax.id, rate: tax.rate })) };
      }),
    );

    // RN-VOU-07.
    const hasStockAffectingLine = resolvedLines.some(
      (resolved) => resolved.item?.tracksStock === true,
    );
    if (voucherType.affectsStock !== 'NONE' && hasStockAffectingLine && !input.warehouseId) {
      throw new MissingWarehouseError();
    }

    // RN-VOU-09: subtotal/taxTotal/total se calculan de las líneas, nunca informados.
    let voucherSubtotal = new Decimal(0);
    let voucherTaxTotal = new Decimal(0);
    const linesToCreate: RepositoryVoucherLineInput[] = resolvedLines.map((resolved, index) => {
      const quantity = new Decimal(resolved.line.quantity);
      const unitPrice = new Decimal(resolved.line.unitPrice);
      const discountPercentage = new Decimal(resolved.line.discountPercentage ?? '0');
      const lineSubtotal = quantity
        .times(unitPrice)
        .times(new Decimal(1).minus(discountPercentage.dividedBy(100)));

      const lineTaxes = resolved.taxes.map((tax) => {
        const rate = new Decimal(tax.rate);
        const amount = lineSubtotal.times(rate).dividedBy(100);
        voucherTaxTotal = voucherTaxTotal.plus(amount);
        return { taxId: tax.taxId, rate: rate.toFixed(4), amount: amount.toFixed(2) };
      });

      voucherSubtotal = voucherSubtotal.plus(lineSubtotal);

      return {
        id: uuidv7(),
        lineNumber: index + 1,
        itemId: resolved.item?.id,
        description: resolved.line.description,
        quantity: quantity.toFixed(3),
        unitPrice: unitPrice.toFixed(4),
        discountPercentage: discountPercentage.toFixed(2),
        subtotal: lineSubtotal.toFixed(2),
        taxes: lineTaxes,
      };
    });
    const voucherTotal = voucherSubtotal.plus(voucherTaxTotal);

    return this.unitOfWork.run(async (ctx) => {
      const number = await this.voucherCounterRepository.getNextNumber(
        input.companyId,
        input.pointOfSaleId,
        input.voucherTypeId,
        ctx,
      );

      const voucher = await this.voucherRepository.create(
        {
          id: uuidv7(),
          companyId: input.companyId,
          branchId: input.branchId,
          pointOfSaleId: input.pointOfSaleId,
          voucherTypeId: input.voucherTypeId,
          number,
          partyId: input.partyId,
          warehouseId: input.warehouseId,
          issueDate: input.issueDate ? new Date(input.issueDate) : now,
          currency: input.currency ?? company?.currency ?? 'ARS',
          exchangeRate: input.exchangeRate ?? '1',
          relatedVoucherId: input.relatedVoucherId,
          subtotal: voucherSubtotal.toFixed(2),
          taxTotal: voucherTaxTotal.toFixed(2),
          total: voucherTotal.toFixed(2),
          createdByUserId: input.requestingUserId,
          lines: linesToCreate,
        },
        ctx,
      );

      if (voucherType.affectsStock !== 'NONE') {
        const allowNegativeStock = company?.allowNegativeStock ?? false;
        const type = resolveStockMovementType(voucherType);
        const direction = voucherType.affectsStock;

        for (let index = 0; index < resolvedLines.length; index++) {
          const resolved = resolvedLines[index];
          if (!resolved.item || !resolved.item.tracksStock) {
            continue;
          }
          const createdLine = linesToCreate[index];
          await this.applyStockMovementService.apply(
            {
              companyId: input.companyId,
              itemId: resolved.item.id,
              warehouseId: input.warehouseId as string,
              direction,
              type,
              quantity: createdLine.quantity,
              unitCost: direction === 'IN' ? createdLine.unitPrice : undefined,
              voucherId: voucher.id,
              userId: input.requestingUserId,
              allowNegativeStock,
            },
            ctx,
          );
        }
      }

      // RN-CTA-04: retrofit de Sprint 3.4 (docs/sprint-3/04-tesoreria.md §0.1).
      if (voucherType.affectsCurrentAccount !== 'NONE') {
        if (customerId) {
          await this.applyCustomerAccountMovementService.apply(
            {
              companyId: input.companyId,
              customerId,
              type: voucherType.affectsCurrentAccount,
              amount: voucher.total,
              voucherId: voucher.id,
            },
            ctx,
          );
        } else if (supplierId) {
          await this.applySupplierAccountMovementService.apply(
            {
              companyId: input.companyId,
              supplierId,
              type: voucherType.affectsCurrentAccount,
              amount: voucher.total,
              voucherId: voucher.id,
            },
            ctx,
          );
        }
      }

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'voucher.create',
          entityType: 'Voucher',
          entityId: voucher.id,
          metadata: {
            voucherTypeId: voucher.voucherTypeId,
            number: voucher.number,
            total: voucher.total,
          },
        },
        ctx,
      );

      return voucher;
    });
  }
}
