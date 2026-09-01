import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CardDetailRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  settlementEntity?: string;
}
