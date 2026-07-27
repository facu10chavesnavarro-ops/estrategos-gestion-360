import { IsString } from 'class-validator';

export class PaymentAllocationRequestDto {
  @IsString()
  voucherId: string;

  @IsString()
  amountApplied: string;
}
