import { IsIn, IsOptional, IsString } from 'class-validator';
import { ImportMode } from '../../domain/import/import.types';

/** Contrato de request reutilizable para cualquier importación CSV (ver CsvImportEngine). */
export class ImportRequestDto {
  @IsString()
  csvContent: string;

  @IsOptional()
  @IsIn(['skip-new-only', 'update-existing', 'skip-silently'])
  mode?: ImportMode;
}
