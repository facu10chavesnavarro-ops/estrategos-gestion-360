import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** RN-003: ninguna anulación/desactivación ocurre sin motivo. */
export class DeactivateRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio para desactivar' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  reason: string;
}
