import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { CsvParserPort } from '../domain/import/csv-parser.port';

@Injectable()
export class CsvParseAdapter extends CsvParserPort {
  parse(csvContent: string): Record<string, string>[] {
    try {
      return parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch (error) {
      throw new BadRequestException(
        `El archivo CSV no se pudo interpretar: ${error instanceof Error ? error.message : 'formato inválido'}`,
      );
    }
  }
}
