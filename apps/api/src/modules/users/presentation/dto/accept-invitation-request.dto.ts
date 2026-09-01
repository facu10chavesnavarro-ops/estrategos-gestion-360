import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationRequestDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede superar los 128 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;
}
