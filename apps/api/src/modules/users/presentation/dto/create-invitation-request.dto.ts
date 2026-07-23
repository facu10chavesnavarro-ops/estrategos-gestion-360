import { IsEmail, IsString } from 'class-validator';

export class CreateInvitationRequestDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @IsString()
  roleId: string;
}
