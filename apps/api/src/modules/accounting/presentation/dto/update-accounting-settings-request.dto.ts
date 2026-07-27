import { IsOptional, IsString } from 'class-validator';

export class UpdateAccountingSettingsRequestDto {
  @IsOptional()
  @IsString()
  accountsReceivableId?: string;

  @IsOptional()
  @IsString()
  accountsPayableId?: string;
}
