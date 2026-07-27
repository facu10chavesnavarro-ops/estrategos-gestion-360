export class JournalEntryLineEntity {
  constructor(
    public readonly id: string,
    public readonly journalEntryId: string,
    public readonly accountId: string,
    public readonly debit: string,
    public readonly credit: string,
    public readonly description: string | null,
  ) {}
}
