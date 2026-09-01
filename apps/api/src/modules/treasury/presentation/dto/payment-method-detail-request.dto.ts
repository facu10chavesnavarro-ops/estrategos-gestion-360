import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { CheckDetailRequestDto } from './check-detail-request.dto';
import { CardDetailRequestDto } from './card-detail-request.dto';

export class PaymentMethodDetailRequestDto {
  @IsString()
  @MaxLength(50)
  paymentMethodId: string;

  @IsString()
  @MaxLength(30)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
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
