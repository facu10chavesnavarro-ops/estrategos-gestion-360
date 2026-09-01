import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCashRegisterRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountId?: string | null;
}
