import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompanyRequestDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MinLength(2, { message: 'La razón social debe tener al menos 2 caracteres' })
  legalName: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  taxCondition?: string;

  @IsOptional()
  @IsString()
  activity?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de contacto no tiene un formato válido' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
