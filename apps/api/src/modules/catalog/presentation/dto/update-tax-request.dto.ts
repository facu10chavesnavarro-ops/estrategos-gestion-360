import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTaxRequestDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salesAccountId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchasesAccountId?: string | null;
}
