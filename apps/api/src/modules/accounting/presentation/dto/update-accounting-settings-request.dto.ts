import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountingSettingsRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountsReceivableId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountsPayableId?: string;
}
