import { IsOptional, IsString } from 'class-validator';

export class UpdateBankAccountRequestDto {
  @IsOptional()
  @IsString()
  bankName?: string;

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
  glAccountId?: string | null;
}
