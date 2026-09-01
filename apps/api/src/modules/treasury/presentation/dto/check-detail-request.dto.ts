import { IsISO8601, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckDetailRequestDto {
  @IsString()
  @MinLength(1, { message: 'El número de cheque es obligatorio' })
  @MaxLength(50)
  number: string;

  @IsString()
  @MinLength(1, { message: 'El banco emisor es obligatorio' })
  @MaxLength(200)
  bankName: string;

  @IsISO8601()
  dueDate: string;
}
