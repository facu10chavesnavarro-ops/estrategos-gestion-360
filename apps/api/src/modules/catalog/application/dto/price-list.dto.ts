export interface CreatePriceListUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  name: string;
  currency: string;
  isDefault?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface UpdatePriceListUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  priceListId: string;
  name?: string;
  currency?: string;
  isDefault?: boolean;
  validFrom?: string;
  validTo?: string | null;
}

export interface ChangePriceListStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  priceListId: string;
}

export interface ListPriceListsUseCaseInput {
  companyId: string;
  isActive?: boolean;
}

export interface SetPriceListItemUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  priceListId: string;
  itemId: string;
  price: string;
}

export interface RemovePriceListItemUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  priceListId: string;
  itemId: string;
}
