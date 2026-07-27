import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodDetailRequestDto } from './payment-method-detail-request.dto';
import { PaymentAllocationRequestDto } from './payment-allocation-request.dto';

export class CreatePaymentRequestDto {
  @IsString()
  partyId: string;

  @IsIn(['COLLECTION', 'PAYMENT'], { message: 'direction debe ser COLLECTION o PAYMENT' })
  direction: 'COLLECTION' | 'PAYMENT';

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  exchangeRate?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'El pago debe informar al menos un medio de pago' })
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDetailRequestDto)
  methodDetails: PaymentMethodDetailRequestDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationRequestDto)
  allocations?: PaymentAllocationRequestDto[];
}
