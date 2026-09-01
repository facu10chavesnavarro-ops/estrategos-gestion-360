import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBankMovementRequestDto {
  @IsIn(['DEPOSIT', 'WITHDRAWAL'], { message: 'type debe ser DEPOSIT o WITHDRAWAL' })
  type: 'DEPOSIT' | 'WITHDRAWAL';

  @IsString()
  @MaxLength(30)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  counterpartAccountId?: string;
}
