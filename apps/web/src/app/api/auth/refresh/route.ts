import { NextResponse } from 'next/server';
import { refreshSession } from '@/lib/auth/refresh';

export async function POST() {
  const ok = await refreshSession();
  if (!ok) {
    return NextResponse.json({ message: 'Sesión expirada' }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}
