import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AccountType } from '../../domain/entities/chart-of-account.entity';

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

export class CreateChartOfAccountRequestDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MinLength(1, { message: 'El código es obligatorio' })
  code: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsIn(ACCOUNT_TYPES, { message: `type debe ser uno de: ${ACCOUNT_TYPES.join(', ')}` })
  type: AccountType;

  @IsOptional()
  @IsBoolean()
  allowsMovements?: boolean;
}
