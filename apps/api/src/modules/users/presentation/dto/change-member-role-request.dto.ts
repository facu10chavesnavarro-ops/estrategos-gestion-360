import { IsString } from 'class-validator';

export class ChangeMemberRoleRequestDto {
  @IsString()
  roleId: string;
}
