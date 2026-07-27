import { IsIn, IsString } from 'class-validator';

export class SetPaymentMethodAccountMappingRequestDto {
  @IsString()
  paymentMethodId: string;

  @IsIn(['COLLECTION', 'PAYMENT'], { message: 'direction debe ser COLLECTION o PAYMENT' })
  direction: 'COLLECTION' | 'PAYMENT';

  @IsString()
  accountId: string;
}
