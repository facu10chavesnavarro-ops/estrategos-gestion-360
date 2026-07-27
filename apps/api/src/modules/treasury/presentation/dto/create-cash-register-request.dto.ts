import { IsString, MinLength } from 'class-validator';

export class CreateCashRegisterRequestDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;
}
