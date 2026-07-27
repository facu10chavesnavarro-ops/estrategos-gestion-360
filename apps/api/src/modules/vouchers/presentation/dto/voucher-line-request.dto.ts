import { IsOptional, IsString, MinLength } from 'class-validator';

export class VoucherLineRequestDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  @MinLength(1, { message: 'La descripción es obligatoria' })
  description: string;

  @IsString()
  quantity: string;

  @IsString()
  unitPrice: string;

  @IsOptional()
  @IsString()
  discountPercentage?: string;
}
