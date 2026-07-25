import { IsBoolean, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePriceListRequestDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'La moneda es obligatoria' })
  currency: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validTo?: string;
}
