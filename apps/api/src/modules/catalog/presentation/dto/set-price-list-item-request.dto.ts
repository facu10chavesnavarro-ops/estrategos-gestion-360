import { IsString } from 'class-validator';

export class SetPriceListItemRequestDto {
  @IsString()
  price: string;
}
