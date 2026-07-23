'use client';

import { useState, FormEvent } from 'react';
import { login, ApiError } from '../../lib/api-client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      // Sprint 0: solo se valida el flujo. Guardar el token en un store de
      // sesión (no localStorage) y redirigir al selector de empresa es
      // trabajo de Sprint 1, junto con el resto de la navegación autenticada.
      // eslint-disable-next-line no-console
      console.log('Login OK', result.user.email);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo conectar con el servidor. Intentá de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={fieldLabelStyle} htmlFor="email">
        Correo
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <label style={{ ...fieldLabelStyle, marginTop: 18 }} htmlFor="password">
        Contraseña
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} style={buttonStyle}>
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </button>

      <a href="#" style={forgotLinkStyle}>
        Olvidé mi contraseña
      </a>
    </form>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: 'var(--ink-soft)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 15,
  border: '1px solid var(--line)',
  borderRadius: 3,
  background: '#fff',
  color: 'var(--ink)',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 26,
  padding: '11px 0',
  fontSize: 15,
  fontWeight: 600,
  color: '#fff',
  background: 'var(--ledger-green)',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
};

const forgotLinkStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  marginTop: 18,
  fontSize: 13,
  color: 'var(--ink-soft)',
  textDecoration: 'none',
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  fontSize: 13,
  color: 'var(--danger)',
};
