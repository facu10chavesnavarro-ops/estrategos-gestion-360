/**
 * Layout compartido por las pantallas públicas fuera de sesión (login,
 * aceptar invitación) — mismo fondo rayado y encabezado con el wordmark
 * en todas, para no romper la consistencia visual del sistema.
 */
export function LedgerAuthLayout({
  children,
  maxWidth = 380,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent, transparent 27px, var(--line) 28px)',
      }}
    >
      <div
        className="w-full rounded border border-[var(--line)] bg-[var(--paper-card)] px-8 py-10 shadow-[0_1px_3px_rgba(22,35,58,0.08)]"
        style={{ maxWidth }}
      >
        <header className="mb-8">
          <div className="mb-1.5 font-mono text-xs tracking-[0.18em] text-[var(--ledger-green)]">
            GESTIÓN 360
          </div>
          <h1 className="m-0 text-[22px] font-bold tracking-[0.02em]">ESTRATEGOS</h1>
          <div className="mt-2.5 h-[3px] w-8 bg-[var(--ledger-green)]" />
        </header>

        {children}
      </div>
    </main>
  );
}
