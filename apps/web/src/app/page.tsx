import { redirect } from 'next/navigation';
import { getRefreshToken } from '@/lib/auth/cookies';

export default function RootPage() {
  redirect(getRefreshToken() ? '/seleccionar-empresa' : '/login');
}
