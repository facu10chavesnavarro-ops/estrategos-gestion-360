import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCashMovementRequestDto {
  @IsIn(['IN', 'OUT'], { message: 'type debe ser IN u OUT' })
  type: 'IN' | 'OUT';

  @IsString()
  @MaxLength(30)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  counterpartAccountId?: string;
}
