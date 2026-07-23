import { Injectable, Logger } from '@nestjs/common';
import {
  InvitationNotifierPort,
  InvitationNotificationInput,
} from '../domain/repositories/invitation-notifier.port';

/**
 * Adaptador sin proveedor de email real (ver §0.2/§0.3 de
 * docs/sprint-1/02-usuarios-roles-permisos-invitaciones.md). El token queda
 * disponible en la respuesta HTTP de creación para poder probar el flujo
 * end-to-end. Reemplazar por un adaptador de SMTP/Gmail/Microsoft 365/
 * SendGrid/SES implementando el mismo InvitationNotifierPort no requiere
 * tocar ningún caso de uso.
 */
@Injectable()
export class NoopInvitationNotifier extends InvitationNotifierPort {
  private readonly logger = new Logger(NoopInvitationNotifier.name);

  async notifyInvitationCreated(
    input: InvitationNotificationInput,
  ): Promise<void> {
    this.logger.debug(
      `Invitación creada para ${input.email} (empresa "${input.companyName}", rol "${input.roleName}") — sin proveedor de email configurado todavía.`,
    );
  }
}
