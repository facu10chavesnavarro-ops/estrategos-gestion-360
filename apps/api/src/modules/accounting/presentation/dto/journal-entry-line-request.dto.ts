import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JournalEntryLineRequestDto {
  @IsString()
  @MaxLength(50)
  accountId: string;

  @IsString()
  @MaxLength(30)
  debit: string;

  @IsString()
  @MaxLength(30)
  credit: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
