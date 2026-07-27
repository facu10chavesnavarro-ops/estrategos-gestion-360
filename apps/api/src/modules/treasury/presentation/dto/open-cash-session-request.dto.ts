import { IsString } from 'class-validator';

export class OpenCashSessionRequestDto {
  @IsString()
  openingBalance: string;
}
