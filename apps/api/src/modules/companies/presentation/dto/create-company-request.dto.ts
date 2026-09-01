import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCompanyRequestDto {
  @IsString()
  @MaxLength(50)
  tenantId: string;

  @IsString()
  @MinLength(2, { message: 'La razón social debe tener al menos 2 caracteres' })
  @MaxLength(200)
  legalName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxCondition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  activity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de contacto no tiene un formato válido' })
  @MaxLength(254)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
