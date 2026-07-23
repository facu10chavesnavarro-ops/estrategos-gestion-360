import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}

export class RefreshRequestDto {
  @IsString()
  refreshToken: string;
}
