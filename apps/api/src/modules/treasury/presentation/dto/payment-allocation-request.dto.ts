import { IsString, MaxLength } from 'class-validator';

export class PaymentAllocationRequestDto {
  @IsString()
  @MaxLength(50)
  voucherId: string;

  @IsString()
  @MaxLength(30)
  amountApplied: string;
}
