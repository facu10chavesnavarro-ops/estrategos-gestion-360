import { IsString, MinLength } from 'class-validator';

export class CreateStockTransferRequestDto {
  @IsString()
  fromWarehouseId: string;

  @IsString()
  toWarehouseId: string;

  @IsString()
  itemId: string;

  @IsString()
  quantity: string;

  @IsString()
  @MinLength(1, { message: 'El motivo es obligatorio' })
  reason: string;
}
