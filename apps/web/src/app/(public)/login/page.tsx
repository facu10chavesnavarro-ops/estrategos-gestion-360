import { LedgerAuthLayout } from '@/components/shared/ledger-auth-layout';
import { LoginForm } from './login-form';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { invitacion?: string };
}) {
  return (
    <LedgerAuthLayout>
      {searchParams.invitacion === 'aceptada' && (
        <p className="mb-5 rounded border border-[var(--ledger-green)]/30 bg-[var(--ledger-green)]/10 px-3 py-2 text-sm text-[var(--ledger-green)]">
          Cuenta creada. Iniciá sesión para continuar.
        </p>
      )}
      <LoginForm />
    </LedgerAuthLayout>
  );
}
