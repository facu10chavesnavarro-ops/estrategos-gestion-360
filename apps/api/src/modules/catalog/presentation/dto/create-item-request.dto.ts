import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateItemRequestDto {
  @IsIn(['PRODUCT', 'SERVICE'], { message: 'type debe ser PRODUCT o SERVICE' })
  type: 'PRODUCT' | 'SERVICE';

  @IsString()
  @MinLength(1, { message: 'El SKU es obligatorio' })
  sku: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  @MinLength(1, { message: 'La unidad de medida es obligatoria' })
  unitOfMeasure: string;

  @IsOptional()
  @IsBoolean()
  tracksStock?: boolean;

  @IsOptional()
  @IsString()
  minimumStock?: string;

  @IsOptional()
  @IsString()
  costPrice?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  taxIds?: string[];
}
