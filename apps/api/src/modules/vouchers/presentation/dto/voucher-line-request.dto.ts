import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VoucherLineRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemId?: string;

  @IsString()
  @MinLength(1, { message: 'La descripción es obligatoria' })
  @MaxLength(1000)
  description: string;

  @IsString()
  @MaxLength(30)
  quantity: string;

  @IsString()
  @MaxLength(30)
  unitPrice: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  discountPercentage?: string;
}
