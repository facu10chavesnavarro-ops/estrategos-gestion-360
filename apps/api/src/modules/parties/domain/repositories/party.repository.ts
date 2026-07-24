import { PartyEntity } from '../entities/party.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

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
  abstract create(input: CreatePartyInput, ctx?: TransactionContext): Promise<PartyEntity>;
  abstract findById(id: string, ctx?: TransactionContext): Promise<PartyEntity | null>;
  abstract findByTaxId(
    companyId: string,
    taxId: string,
    ctx?: TransactionContext,
  ): Promise<PartyEntity | null>;
  abstract update(
    id: string,
    input: UpdatePartyInput,
    ctx?: TransactionContext,
  ): Promise<PartyEntity>;
}
