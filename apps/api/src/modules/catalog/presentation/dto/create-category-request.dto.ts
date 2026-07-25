import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryRequestDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;
}
