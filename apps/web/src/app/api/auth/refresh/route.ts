import { NextRequest, NextResponse } from 'next/server';
import { refreshSession } from '@/lib/auth/refresh';
import { assertSameOrigin } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ok = await refreshSession();
  if (!ok) {
    return NextResponse.json({ message: 'Sesión expirada' }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}
