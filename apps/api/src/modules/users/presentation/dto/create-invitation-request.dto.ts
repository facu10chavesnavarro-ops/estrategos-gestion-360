import { IsEmail, IsString, MaxLength } from 'class-validator';

export class CreateInvitationRequestDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(50)
  roleId: string;
}
