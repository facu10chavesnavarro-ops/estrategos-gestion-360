import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth/cookies';
import { refreshSession } from '@/lib/auth/refresh';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Proxy server-to-server hacia el backend: inyecta el Authorization header
 * desde la cookie httpOnly (nunca visible para el navegador) y reenvía
 * X-Company-Id tal cual lo haya puesto el cliente (que lo conoce por el
 * [companyId] de la URL, ver 00-arquitectura-frontend.md §2.4).
 *
 * Si el backend responde 401, intenta una renovación transparente (rotación
 * de access+refresh, ver refreshSession) y reintenta una sola vez — el
 * componente que llamó a apiFetch nunca ve el 401 intermedio.
 */
async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetUrl = `${API_URL}/api/v1/${path.join('/')}${request.nextUrl.search}`;
  const companyId = request.headers.get('x-company-id');
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.text() : undefined;

  const forward = (accessToken: string | undefined) => {
    const headers: Record<string, string> = {};
    if (hasBody) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (companyId) headers['X-Company-Id'] = companyId;
    return fetch(targetUrl, { method: request.method, headers, body });
  };

  let accessToken = getAccessToken();
  let backendRes = await forward(accessToken);

  if (backendRes.status === 401 && accessToken) {
    const refreshed = await refreshSession();
    if (refreshed) {
      accessToken = getAccessToken();
      backendRes = await forward(accessToken);
    }
  }

  const responseBody = await backendRes.text();
  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

type RouteContext = { params: { path: string[] } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  return proxy(request, params.path);
}
export async function POST(request: NextRequest, { params }: RouteContext) {
  return proxy(request, params.path);
}
export async function PUT(request: NextRequest, { params }: RouteContext) {
  return proxy(request, params.path);
}
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return proxy(request, params.path);
}
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return proxy(request, params.path);
}
