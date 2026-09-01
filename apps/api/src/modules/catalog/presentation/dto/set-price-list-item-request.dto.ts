import { IsString, MaxLength } from 'class-validator';

export class SetPriceListItemRequestDto {
  @IsString()
  @MaxLength(30)
  price: string;
}
