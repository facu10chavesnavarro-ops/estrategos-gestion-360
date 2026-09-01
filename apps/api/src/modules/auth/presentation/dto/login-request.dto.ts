import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  // Auditoría de seguridad (hallazgo Bajo #6): argon2 es deliberadamente
  // costoso — sin tope, un input arbitrariamente largo amplifica ese costo
  // (vector de DoS en el endpoint de login, que ya tiene rate limiting pero
  // esto es defensa adicional).
  @MaxLength(128, { message: 'La contraseña no puede superar los 128 caracteres' })
  password: string;
}

export class RefreshRequestDto {
  @IsString()
  @MaxLength(500)
  refreshToken: string;
}
