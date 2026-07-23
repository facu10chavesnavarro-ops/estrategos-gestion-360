import { IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptInvitationRequestDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
