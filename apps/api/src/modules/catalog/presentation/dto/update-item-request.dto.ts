import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateItemRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El SKU no puede estar vacío' })
  sku?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  longDescription?: string | null;

  @IsOptional()
  @IsString()
  barcode?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsBoolean()
  tracksStock?: boolean;

  @IsOptional()
  @IsString()
  minimumStock?: string | null;

  @IsOptional()
  @IsString()
  costPrice?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  taxIds?: string[];
}
