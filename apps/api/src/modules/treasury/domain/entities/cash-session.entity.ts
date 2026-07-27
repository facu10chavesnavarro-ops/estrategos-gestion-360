export class CashSessionEntity {
  constructor(
    public readonly id: string,
    public readonly cashRegisterId: string,
    public readonly openedByUserId: string,
    public readonly openingBalance: string,
    public readonly openedAt: Date,
    public readonly closedByUserId: string | null,
    public readonly closingBalance: string | null,
    public readonly expectedBalance: string | null,
    public readonly difference: string | null,
    public readonly closedAt: Date | null,
  ) {}

  get isOpen(): boolean {
    return this.closedAt === null;
  }
}
