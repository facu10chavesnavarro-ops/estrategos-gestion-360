import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChartOfAccountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200)
  name?: string;
}
