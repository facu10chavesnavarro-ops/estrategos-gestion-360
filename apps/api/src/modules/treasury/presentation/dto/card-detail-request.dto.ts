import { IsOptional, IsString } from 'class-validator';

export class CardDetailRequestDto {
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  settlementEntity?: string;
}
