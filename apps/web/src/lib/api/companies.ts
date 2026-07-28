import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './http-client';
import { queryKeys } from './query-keys';
import type { SessionCompany } from '../stores/use-session-store';

export async function fetchMyCompanies(): Promise<SessionCompany[]> {
  return apiFetch<SessionCompany[]>('me/companies', '');
}

export function useMyCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.mine(),
    queryFn: fetchMyCompanies,
  });
}
