import { IsOptional, IsString } from 'class-validator';

export class JournalEntryLineRequestDto {
  @IsString()
  accountId: string;

  @IsString()
  debit: string;

  @IsString()
  credit: string;

  @IsOptional()
  @IsString()
  description?: string;
}
