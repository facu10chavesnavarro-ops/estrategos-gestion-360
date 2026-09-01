import { IsString, MaxLength } from 'class-validator';

export class ChangeMemberRoleRequestDto {
  @IsString()
  @MaxLength(50)
  roleId: string;
}
