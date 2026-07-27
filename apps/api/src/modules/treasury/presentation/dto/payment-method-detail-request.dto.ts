import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CheckDetailRequestDto } from './check-detail-request.dto';
import { CardDetailRequestDto } from './card-detail-request.dto';

export class PaymentMethodDetailRequestDto {
  @IsString()
  paymentMethodId: string;

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckDetailRequestDto)
  checkDetail?: CheckDetailRequestDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardDetailRequestDto)
  cardDetail?: CardDetailRequestDto;
}
