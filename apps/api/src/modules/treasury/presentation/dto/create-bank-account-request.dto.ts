import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBankAccountRequestDto {
  @IsString()
  @MinLength(1, { message: 'El banco es obligatorio' })
  bankName: string;

  @IsIn(['CHECKING', 'SAVINGS'], { message: 'accountType debe ser CHECKING o SAVINGS' })
  accountType: 'CHECKING' | 'SAVINGS';

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  cbu?: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
