export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export class InvitationEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly email: string,
    public readonly roleId: string,
    public readonly invitedByUserId: string,
    public readonly revokedByUserId: string | null,
    public readonly expiresAt: Date,
    public readonly acceptedAt: Date | null,
    public readonly revokedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  /** Estado calculado, no persistido (ver docs/sprint-1/02-...md sección 1.1). */
  status(): InvitationStatus {
    if (this.acceptedAt) return 'accepted';
    if (this.revokedAt) return 'revoked';
    if (this.expiresAt.getTime() <= Date.now()) return 'expired';
    return 'pending';
  }

  isPending(): boolean {
    return this.status() === 'pending';
  }
}
