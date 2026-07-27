import { Injectable } from '@nestjs/common';
import { PointOfSaleRepository } from '../../domain/repositories/point-of-sale.repository';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';

@Injectable()
export class ListPointsOfSaleUseCase {
  constructor(private readonly pointOfSaleRepository: PointOfSaleRepository) {}

  async execute(branchId: string): Promise<PointOfSaleEntity[]> {
    return this.pointOfSaleRepository.findAllByBranch(branchId);
  }
}
