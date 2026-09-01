import { IsString, MaxLength } from 'class-validator';

export class CloseCashSessionRequestDto {
  @IsString()
  @MaxLength(30)
  closingBalance: string;
}
