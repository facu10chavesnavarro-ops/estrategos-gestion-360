import { AccountType } from '../domain/entities/chart-of-account.entity';

/**
 * Claves reservadas para localizar, después de clonar la plantilla, las
 * cuentas que otras piezas del sistema necesitan referenciar (§2.1 de
 * docs/sprint-4/00-arquitectura-contabilidad.md). Solo AR/AP se usan hoy
 * (para `AccountingSettings`); el resto quedan marcadas `isSystemAccount`
 * para protegerlas de desactivación (RN-ACC-02) y disponibles para que el
 * usuario las mapee manualmente desde Category/Tax/CashRegister/
 * BankAccount/CompanyPaymentMethodAccount.
 */
export const CHART_OF_ACCOUNTS_TEMPLATE_KEYS = {
  ACCOUNTS_RECEIVABLE: 'ACCOUNTS_RECEIVABLE',
  ACCOUNTS_PAYABLE: 'ACCOUNTS_PAYABLE',
} as const;

export interface ChartOfAccountTemplateItem {
  code: string;
  parentCode: string | null;
  name: string;
  type: AccountType;
  allowsMovements: boolean;
  isSystemAccount: boolean;
  key?: string;
}

/**
 * Plan de Cuentas estándar argentino mínimo (§2.1): cubre las cuentas de
 * sistema imprescindibles (Caja, Bancos, Deudores por Ventas, Proveedores,
 * IVA Débito/Crédito Fiscal, Ventas, Compras, Valores a Depositar, Cheques
 * Emitidos a Pagar) más un Patrimonio Neto mínimo. Se clona por empresa al
 * activar Contabilidad (`ActivateAccountingUseCase`); la empresa puede
 * agregar cuentas propias después.
 */
export const CHART_OF_ACCOUNTS_TEMPLATE: ChartOfAccountTemplateItem[] = [
  { code: '1', parentCode: null, name: 'Activo', type: 'ASSET', allowsMovements: false, isSystemAccount: false },
  { code: '1.1', parentCode: '1', name: 'Activo Corriente', type: 'ASSET', allowsMovements: false, isSystemAccount: false },
  { code: '1.1.01', parentCode: '1.1', name: 'Caja', type: 'ASSET', allowsMovements: true, isSystemAccount: true },
  { code: '1.1.02', parentCode: '1.1', name: 'Bancos', type: 'ASSET', allowsMovements: true, isSystemAccount: true },
  {
    code: '1.1.03',
    parentCode: '1.1',
    name: 'Deudores por Ventas',
    type: 'ASSET',
    allowsMovements: true,
    isSystemAccount: true,
    key: CHART_OF_ACCOUNTS_TEMPLATE_KEYS.ACCOUNTS_RECEIVABLE,
  },
  { code: '1.1.04', parentCode: '1.1', name: 'Valores a Depositar', type: 'ASSET', allowsMovements: true, isSystemAccount: true },
  { code: '1.1.05', parentCode: '1.1', name: 'IVA Crédito Fiscal', type: 'ASSET', allowsMovements: true, isSystemAccount: true },

  { code: '2', parentCode: null, name: 'Pasivo', type: 'LIABILITY', allowsMovements: false, isSystemAccount: false },
  { code: '2.1', parentCode: '2', name: 'Pasivo Corriente', type: 'LIABILITY', allowsMovements: false, isSystemAccount: false },
  {
    code: '2.1.01',
    parentCode: '2.1',
    name: 'Proveedores',
    type: 'LIABILITY',
    allowsMovements: true,
    isSystemAccount: true,
    key: CHART_OF_ACCOUNTS_TEMPLATE_KEYS.ACCOUNTS_PAYABLE,
  },
  { code: '2.1.02', parentCode: '2.1', name: 'IVA Débito Fiscal', type: 'LIABILITY', allowsMovements: true, isSystemAccount: true },
  { code: '2.1.03', parentCode: '2.1', name: 'Cheques Emitidos a Pagar', type: 'LIABILITY', allowsMovements: true, isSystemAccount: true },

  { code: '3', parentCode: null, name: 'Patrimonio Neto', type: 'EQUITY', allowsMovements: false, isSystemAccount: false },
  { code: '3.1', parentCode: '3', name: 'Capital', type: 'EQUITY', allowsMovements: true, isSystemAccount: false },
  { code: '3.2', parentCode: '3', name: 'Resultados Acumulados', type: 'EQUITY', allowsMovements: true, isSystemAccount: false },

  { code: '4', parentCode: null, name: 'Ingresos', type: 'INCOME', allowsMovements: false, isSystemAccount: false },
  { code: '4.1', parentCode: '4', name: 'Ventas', type: 'INCOME', allowsMovements: true, isSystemAccount: true },

  { code: '5', parentCode: null, name: 'Egresos', type: 'EXPENSE', allowsMovements: false, isSystemAccount: false },
  { code: '5.1', parentCode: '5', name: 'Compras', type: 'EXPENSE', allowsMovements: true, isSystemAccount: true },
];
