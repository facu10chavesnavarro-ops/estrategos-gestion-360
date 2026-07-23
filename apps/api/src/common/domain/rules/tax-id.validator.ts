/** Solo valida formato (NN-NNNNNNNN-N, con o sin guiones), no existencia real ante ARCA. */
export function isValidTaxId(taxId: string): boolean {
  const digitsOnly = taxId.replace(/-/g, '');
  return /^\d{11}$/.test(digitsOnly);
}
