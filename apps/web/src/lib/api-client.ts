const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new ApiError(
      typeof body.message === 'string'
        ? body.message
        : 'No se pudo iniciar sesión',
      res.status,
    );
  }

  return body as LoginResponse;
}
