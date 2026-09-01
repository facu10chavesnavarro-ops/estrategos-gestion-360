import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaxRequestDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name: string;

  @IsIn(['VAT', 'PERCEPTION', 'WITHHOLDING'], {
    message: 'type debe ser VAT, PERCEPTION o WITHHOLDING',
  })
  type: 'VAT' | 'PERCEPTION' | 'WITHHOLDING';

  @IsString()
  @MaxLength(30)
  rate: string;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validTo?: string;
}
