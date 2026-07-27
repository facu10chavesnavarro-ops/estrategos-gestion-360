import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { VoucherLineRequestDto } from './voucher-line-request.dto';

export class CreateVoucherRequestDto {
  @IsString()
  branchId: string;

  @IsString()
  pointOfSaleId: string;

  @IsString()
  voucherTypeId: string;

  @IsString()
  partyId: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  exchangeRate?: string;

  @IsOptional()
  @IsString()
  relatedVoucherId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'El comprobante debe tener al menos una línea' })
  @ValidateNested({ each: true })
  @Type(() => VoucherLineRequestDto)
  lines: VoucherLineRequestDto[];
}
