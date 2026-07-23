export interface InvitationNotificationInput {
  email: string;
  token: string;
  companyName: string;
  roleName: string;
}

/**
 * RN-USR-14: desacopla la creación de una invitación de CÓMO se le avisa al
 * invitado. Hoy no hay ningún proveedor de email conectado (ver
 * docs/sprint-1/02-usuarios-roles-permisos-invitaciones.md §0.2/§0.3) — el
 * adaptador de este sprint es un no-op. El día que se conecte SMTP, Gmail,
 * Microsoft 365, SendGrid o SES, se escribe un adaptador nuevo que implemente
 * esta misma interfaz: cero cambios en CreateInvitationUseCase.
 */
export abstract class InvitationNotifierPort {
  abstract notifyInvitationCreated(
    input: InvitationNotificationInput,
  ): Promise<void>;
}
