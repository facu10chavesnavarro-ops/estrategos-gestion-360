import { IsISO8601, IsString, MinLength } from 'class-validator';

export class CheckDetailRequestDto {
  @IsString()
  @MinLength(1, { message: 'El número de cheque es obligatorio' })
  number: string;

  @IsString()
  @MinLength(1, { message: 'El banco emisor es obligatorio' })
  bankName: string;

  @IsISO8601()
  dueDate: string;
}
