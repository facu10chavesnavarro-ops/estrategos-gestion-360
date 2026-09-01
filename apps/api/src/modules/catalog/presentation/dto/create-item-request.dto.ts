import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateItemRequestDto {
  @IsIn(['PRODUCT', 'SERVICE'], { message: 'type debe ser PRODUCT o SERVICE' })
  type: 'PRODUCT' | 'SERVICE';

  @IsString()
  @MinLength(1, { message: 'El SKU es obligatorio' })
  @MaxLength(100)
  sku: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryId?: string;

  @IsString()
  @MinLength(1, { message: 'La unidad de medida es obligatoria' })
  @MaxLength(20)
  unitOfMeasure: string;

  @IsOptional()
  @IsBoolean()
  tracksStock?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  minimumStock?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  costPrice?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  taxIds?: string[];
}
