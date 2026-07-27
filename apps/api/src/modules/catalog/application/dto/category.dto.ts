export interface CreateCategoryUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  parentId?: string;
  name: string;
}

export interface UpdateCategoryUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  categoryId: string;
  parentId?: string | null;
  name?: string;
  salesAccountId?: string | null;
  purchasesAccountId?: string | null;
}

export interface ChangeCategoryStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  categoryId: string;
}

export interface ListCategoriesUseCaseInput {
  companyId: string;
  isActive?: boolean;
}
