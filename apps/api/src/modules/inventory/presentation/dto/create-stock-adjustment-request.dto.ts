import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateStockAdjustmentRequestDto {
  @IsString()
  itemId: string;

  @IsIn(['IN', 'OUT'], { message: 'direction debe ser IN u OUT' })
  direction: 'IN' | 'OUT';

  @IsString()
  quantity: string;

  @IsOptional()
  @IsString()
  unitCost?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
