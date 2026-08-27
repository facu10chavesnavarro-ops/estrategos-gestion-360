import { redirect } from 'next/navigation';
import { getRefreshToken } from '@/lib/auth/cookies';

export default async function RootPage() {
  redirect((await getRefreshToken()) ? '/seleccionar-empresa' : '/login');
}
