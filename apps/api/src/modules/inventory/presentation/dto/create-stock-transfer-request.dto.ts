import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStockTransferRequestDto {
  @IsString()
  @MaxLength(50)
  fromWarehouseId: string;

  @IsString()
  @MaxLength(50)
  toWarehouseId: string;

  @IsString()
  @MaxLength(50)
  itemId: string;

  @IsString()
  @MaxLength(30)
  quantity: string;

  @IsString()
  @MinLength(1, { message: 'El motivo es obligatorio' })
  @MaxLength(500)
  reason: string;
}
