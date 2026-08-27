import { fetchInvitationPreview, type InvitationPreview } from '@/lib/api/invitations-public';
import { ApiError } from '@/lib/api/http-client';
import { LedgerAuthLayout } from '@/components/shared/ledger-auth-layout';
import { AcceptInvitationForm } from './accept-invitation-form';

const STATUS_MESSAGE: Record<Exclude<InvitationPreview['status'], 'pending'>, string> = {
  accepted: 'Esta invitación ya fue aceptada. Iniciá sesión con tu cuenta.',
  revoked: 'Esta invitación fue revocada. Pedile a un administrador que te invite de nuevo.',
  expired: 'Esta invitación venció. Pedile a un administrador que te invite de nuevo.',
};

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let preview: InvitationPreview | null = null;
  let loadError: string | null = null;

  try {
    preview = await fetchInvitationPreview(token);
  } catch (err) {
    loadError =
      err instanceof ApiError && err.status === 404
        ? 'Esta invitación no existe.'
        : 'No se pudo cargar la invitación. Intentá de nuevo más tarde.';
  }

  return (
    <LedgerAuthLayout maxWidth={420}>
      {loadError && (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      )}

      {preview && preview.status !== 'pending' && (
        <p className="text-sm text-muted-foreground">{STATUS_MESSAGE[preview.status]}</p>
      )}

      {preview && preview.status === 'pending' && (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Te invitaron a sumarte a <strong className="text-foreground">{preview.companyName}</strong>{' '}
            como <strong className="text-foreground">{preview.roleName}</strong>.
          </p>
          <AcceptInvitationForm token={token} />
        </>
      )}
    </LedgerAuthLayout>
  );
}
