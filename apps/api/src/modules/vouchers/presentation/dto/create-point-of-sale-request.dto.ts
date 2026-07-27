import { IsString, MinLength } from 'class-validator';

export class CreatePointOfSaleRequestDto {
  @IsString()
  @MinLength(1, { message: 'El código es obligatorio' })
  code: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;
}
