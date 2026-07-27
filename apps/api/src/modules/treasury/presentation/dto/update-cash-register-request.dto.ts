import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCashRegisterRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsString()
  accountId?: string | null;
}
