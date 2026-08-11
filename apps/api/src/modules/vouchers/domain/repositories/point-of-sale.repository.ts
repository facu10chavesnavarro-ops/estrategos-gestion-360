import { PointOfSaleEntity } from '../entities/point-of-sale.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreatePointOfSaleInput {
  companyId: string;
  branchId: string;
  code: string;
  name: string;
}

export interface UpdatePointOfSaleInput {
  name?: string;
}

export abstract class PointOfSaleRepository {
  abstract create(
    input: CreatePointOfSaleInput,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity | null>;
  abstract findByCompanyAndCode(
    companyId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity | null>;
  /**
   * Escaneado por `companyId` además de `branchId` (auditoría de
   * seguridad, hallazgo A1): sin este filtro, un usuario de una empresa
   * podía listar los puntos de venta de una sucursal de otra empresa
   * pasando su id.
   */
  abstract findAllByBranch(branchId: string, companyId: string): Promise<PointOfSaleEntity[]>;
  abstract update(
    id: string,
    input: UpdatePointOfSaleInput,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity>;
}
