import { IsIn, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTaxRequestDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsIn(['VAT', 'PERCEPTION', 'WITHHOLDING'], {
    message: 'type debe ser VAT, PERCEPTION o WITHHOLDING',
  })
  type: 'VAT' | 'PERCEPTION' | 'WITHHOLDING';

  @IsString()
  rate: string;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validTo?: string;
}
