import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBankAccountRequestDto {
  @IsString()
  @MinLength(1, { message: 'El banco es obligatorio' })
  @MaxLength(200)
  bankName: string;

  @IsIn(['CHECKING', 'SAVINGS'], { message: 'accountType debe ser CHECKING o SAVINGS' })
  accountType: 'CHECKING' | 'SAVINGS';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cbu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  alias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;
}
