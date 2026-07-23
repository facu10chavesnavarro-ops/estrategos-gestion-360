-- RN-TER-08: el límite de crédito, si se informa, no puede ser negativo.
-- Ya se valida en CreateCustomerUseCase/UpdateCustomerUseCase, pero eso solo
-- protege el camino que pasa por esos casos de uso. Este CHECK es la
-- defensa en profundidad a nivel de base de datos (auditoría técnica
-- pre-Sprint 3): cualquier escritura futura que no pase por esos casos de
-- uso (una migración de datos, un script, un módulo nuevo con un bug) no
-- puede dejar un valor inválido, sin importar por dónde entre.
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_credit_limit_non_negative"
  CHECK ("credit_limit" IS NULL OR "credit_limit" >= 0);