import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from './csrf';

function makeRequest(url: string, origin: string | null): NextRequest {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  return new NextRequest(url, { method: 'POST', headers });
}

describe('assertSameOrigin', () => {
  it('deja pasar (devuelve null) cuando el Origin coincide con el origin del propio request', () => {
    const request = makeRequest('https://estrategos.app/api/auth/login', 'https://estrategos.app');
    expect(assertSameOrigin(request)).toBeNull();
  });

  it('rechaza con 403 cuando el Origin es de otro sitio', () => {
    const request = makeRequest('https://estrategos.app/api/auth/login', 'https://evil.com');
    const result = assertSameOrigin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('rechaza con 403 cuando falta el header Origin', () => {
    const request = makeRequest('https://estrategos.app/api/auth/login', null);
    const result = assertSameOrigin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('rechaza cuando el Origin coincide en host pero no en protocolo (http vs https)', () => {
    const request = makeRequest('https://estrategos.app/api/auth/login', 'http://estrategos.app');
    const result = assertSameOrigin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
