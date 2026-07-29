import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { login } from '@/lib/api/auth';
import { fetchMyCompanies } from '@/lib/api/companies';
import { ApiError } from '@/lib/api/http-client';
import { useSessionStore } from '@/lib/stores/use-session-store';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api/auth', () => ({
  login: vi.fn(),
}));

vi.mock('@/lib/api/companies', () => ({
  fetchMyCompanies: vi.fn(),
}));

const mockedLogin = vi.mocked(login);
const mockedFetchMyCompanies = vi.mocked(fetchMyCompanies);

beforeEach(() => {
  pushMock.mockReset();
  mockedLogin.mockReset();
  mockedFetchMyCompanies.mockReset();
  useSessionStore.getState().clearSession();
});

describe('LoginForm', () => {
  it('muestra errores de validación cuando se envía vacío', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText('El correo es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de error del backend cuando el login falla', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValueOnce(new ApiError('Credenciales inválidas', 401));
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Correo'), 'admin@estrategos.local');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(mockedFetchMyCompanies).not.toHaveBeenCalled();
  });

  it('redirige directo a /:companyId/inicio si el usuario tiene una sola empresa', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({
      user: { id: 'u1', email: 'admin@estrategos.local', fullName: 'Admin' },
    });
    mockedFetchMyCompanies.mockResolvedValueOnce([
      { id: 'c1', legalName: 'Empresa Única SRL', taxId: null, isActive: true },
    ]);
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Correo'), 'admin@estrategos.local');
    await user.type(screen.getByLabelText('Contraseña'), 'CambiarEsta123!');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/c1/inicio'));
  });

  it('redirige a /seleccionar-empresa si el usuario tiene más de una empresa', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({
      user: { id: 'u1', email: 'admin@estrategos.local', fullName: 'Admin' },
    });
    mockedFetchMyCompanies.mockResolvedValueOnce([
      { id: 'c1', legalName: 'Empresa A', taxId: null, isActive: true },
      { id: 'c2', legalName: 'Empresa B', taxId: null, isActive: true },
    ]);
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Correo'), 'admin@estrategos.local');
    await user.type(screen.getByLabelText('Contraseña'), 'CambiarEsta123!');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/seleccionar-empresa'));
  });
});
