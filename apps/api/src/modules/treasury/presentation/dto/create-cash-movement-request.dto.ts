import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCashMovementRequestDto {
  @IsIn(['IN', 'OUT'], { message: 'type debe ser IN u OUT' })
  type: 'IN' | 'OUT';

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  counterpartAccountId?: string;
}
