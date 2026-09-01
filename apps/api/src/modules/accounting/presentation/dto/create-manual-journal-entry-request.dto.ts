import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { JournalEntryLineRequestDto } from './journal-entry-line-request.dto';

export class CreateManualJournalEntryRequestDto {
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsString()
  @MinLength(1, { message: 'La descripción es obligatoria' })
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'El asiento debe tener al menos dos líneas' })
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineRequestDto)
  lines: JournalEntryLineRequestDto[];
}
