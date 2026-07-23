import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateSupplierRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'La razón social debe tener al menos 2 caracteres' })
  legalName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  taxCondition?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Los días de pago no pueden ser negativos' })
  paymentTermDays?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @IsOptional()
  @IsString()
  bankCbu?: string;
}
