import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'eg_access_token';
const REFRESH_TOKEN_COOKIE = 'eg_refresh_token';

// Debe coincidir con los TTL de apps/api/src/modules/auth/infrastructure/jwt-token-provider.ts
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setSessionCookies(accessToken: string, refreshToken: string) {
  const store = cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearSessionCookies() {
  const store = cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_TOKEN_COOKIE)?.value;
}

export function getRefreshToken(): string | undefined {
  return cookies().get(REFRESH_TOKEN_COOKIE)?.value;
}
