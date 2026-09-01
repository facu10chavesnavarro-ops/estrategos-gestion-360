import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VoucherLineRequestDto } from './voucher-line-request.dto';

export class CreateVoucherRequestDto {
  @IsString()
  @MaxLength(50)
  branchId: string;

  @IsString()
  @MaxLength(50)
  pointOfSaleId: string;

  @IsString()
  @MaxLength(50)
  voucherTypeId: string;

  @IsString()
  @MaxLength(50)
  partyId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  warehouseId?: string;

  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  exchangeRate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  relatedVoucherId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'El comprobante debe tener al menos una línea' })
  @ValidateNested({ each: true })
  @Type(() => VoucherLineRequestDto)
  lines: VoucherLineRequestDto[];
}
