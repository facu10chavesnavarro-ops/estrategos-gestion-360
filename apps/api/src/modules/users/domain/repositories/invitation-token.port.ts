export interface GeneratedInvitationToken {
  /** Se devuelve una única vez, al crear la invitación. Nunca se persiste. */
  token: string;
  tokenHash: string;
}

/** Genera y hashea el token de invitación. Nunca lo persiste en texto plano (RN-USR-03). */
export abstract class InvitationTokenPort {
  abstract generate(): GeneratedInvitationToken;
  abstract hash(token: string): string;
}
