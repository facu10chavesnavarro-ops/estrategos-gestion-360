import { IsEmail, IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerRequestDto {
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
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Los días de pago no pueden ser negativos' })
  paymentTermDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  creditLimit?: string;
}
