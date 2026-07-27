import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBankMovementRequestDto {
  @IsIn(['DEPOSIT', 'WITHDRAWAL'], { message: 'type debe ser DEPOSIT o WITHDRAWAL' })
  type: 'DEPOSIT' | 'WITHDRAWAL';

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  counterpartAccountId?: string;
}
