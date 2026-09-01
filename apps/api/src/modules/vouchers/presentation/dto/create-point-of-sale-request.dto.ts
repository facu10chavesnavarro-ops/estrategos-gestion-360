import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePointOfSaleRequestDto {
  @IsString()
  @MinLength(1, { message: 'El código es obligatorio' })
  @MaxLength(30)
  code: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name: string;
}
