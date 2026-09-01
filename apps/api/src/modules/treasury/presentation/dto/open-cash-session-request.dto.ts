import { IsString, MaxLength } from 'class-validator';

export class OpenCashSessionRequestDto {
  @IsString()
  @MaxLength(30)
  openingBalance: string;
}
