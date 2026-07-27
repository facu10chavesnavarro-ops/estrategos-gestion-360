import { Injectable } from '@nestjs/common';
import { PointOfSaleRepository } from '../../domain/repositories/point-of-sale.repository';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';
import { PointOfSaleNotFoundError } from '../../domain/errors/point-of-sale.errors';

@Injectable()
export class GetPointOfSaleByIdUseCase {
  constructor(private readonly pointOfSaleRepository: PointOfSaleRepository) {}

  async execute(pointOfSaleId: string, companyId: string): Promise<PointOfSaleEntity> {
    const pointOfSale = await this.pointOfSaleRepository.findById(pointOfSaleId, companyId);
    if (!pointOfSale) {
      throw new PointOfSaleNotFoundError();
    }
    return pointOfSale;
  }
}
