import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePriceListRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validTo?: string | null;
}
