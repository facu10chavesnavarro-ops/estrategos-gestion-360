import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentId?: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name: string;
}
