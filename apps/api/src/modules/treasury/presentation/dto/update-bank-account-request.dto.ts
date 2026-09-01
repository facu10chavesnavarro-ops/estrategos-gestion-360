import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBankAccountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string;

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
  @MaxLength(50)
  glAccountId?: string | null;
}
