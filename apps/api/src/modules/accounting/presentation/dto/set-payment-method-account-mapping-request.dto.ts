import { IsIn, IsString, MaxLength } from 'class-validator';

export class SetPaymentMethodAccountMappingRequestDto {
  @IsString()
  @MaxLength(50)
  paymentMethodId: string;

  @IsIn(['COLLECTION', 'PAYMENT'], { message: 'direction debe ser COLLECTION o PAYMENT' })
  direction: 'COLLECTION' | 'PAYMENT';

  @IsString()
  @MaxLength(50)
  accountId: string;
}
