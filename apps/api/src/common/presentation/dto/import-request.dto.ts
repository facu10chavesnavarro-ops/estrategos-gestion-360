import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ImportMode } from '../../domain/import/import.types';

/** Contrato de request reutilizable para cualquier importación CSV (ver CsvImportEngine). */
export class ImportRequestDto {
  @IsString()
  // Auditoría de seguridad (hallazgo Medio #1): cota explícita, no depender
  // solo del límite implícito de body-parser. 2_000_000 caracteres (~2MB)
  // alcanza sobrado para el tope de filas de CsvImportEngine.MAX_ROWS.
  @MaxLength(2_000_000)
  csvContent: string;

  @IsOptional()
  @IsIn(['skip-new-only', 'update-existing', 'skip-silently'])
  mode?: ImportMode;
}
