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

  /** RN-PAY-10: obligatorio si algún medio requiere movimiento de caja. */
  @IsOptional()
  @IsString()
  cashSessionId?: string;

  /** RN-PAY-10: obligatorio si algún medio requiere movimiento bancario. */
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  /**
   * RN-PAY-11: clave de idempotencia opcional generada por el cliente (un
   * valor por intento de envío, reutilizado en reintentos del mismo
   * intento). Si ya existe un pago con esta clave para la empresa, se
   * devuelve ese pago tal cual en vez de crear uno nuevo.
   */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
