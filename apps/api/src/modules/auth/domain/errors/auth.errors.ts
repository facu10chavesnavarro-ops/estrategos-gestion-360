export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserInactiveError extends Error {
  constructor() {
    super('El usuario está inactivo');
    this.name = 'UserInactiveError';
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Refresh token inválido o expirado');
    this.name = 'InvalidRefreshTokenError';
  }
}
