import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateItemRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El SKU no puede estar vacío' })
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unitOfMeasure?: string;

  @IsOptional()
  @IsBoolean()
  tracksStock?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  minimumStock?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  costPrice?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  taxIds?: string[];
}
