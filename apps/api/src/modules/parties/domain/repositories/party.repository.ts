import { PartyEntity } from '../entities/party.entity';

export interface CreatePartyInput {
  companyId: string;
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
}

export interface UpdatePartyInput {
  legalName?: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
}

export abstract class PartyRepository {
  abstract create(input: CreatePartyInput): Promise<PartyEntity>;
  abstract findById(id: string): Promise<PartyEntity | null>;
  abstract findByTaxId(companyId: string, taxId: string): Promise<PartyEntity | null>;
  abstract update(id: string, input: UpdatePartyInput): Promise<PartyEntity>;
}
