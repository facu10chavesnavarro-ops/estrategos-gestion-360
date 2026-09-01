import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStockAdjustmentRequestDto {
  @IsString()
  @MaxLength(50)
  itemId: string;

  @IsIn(['IN', 'OUT'], { message: 'direction debe ser IN u OUT' })
  direction: 'IN' | 'OUT';

  @IsString()
  @MaxLength(30)
  quantity: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unitCost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
