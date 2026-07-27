import { IsString } from 'class-validator';

export class CloseCashSessionRequestDto {
  @IsString()
  closingBalance: string;
}
