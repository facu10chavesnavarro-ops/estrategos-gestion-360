import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBranchRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
