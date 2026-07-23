import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent, transparent 27px, var(--line) 28px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--paper-card)',
          border: '1px solid var(--line)',
          borderRadius: 4,
          padding: '40px 32px',
          boxShadow: '0 1px 3px rgba(22, 35, 58, 0.08)',
        }}
      >
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              color: 'var(--ledger-green)',
              marginBottom: 6,
            }}
          >
            GESTIÓN 360
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            ESTRATEGOS
          </h1>
          <div
            style={{
              marginTop: 10,
              width: 32,
              height: 3,
              background: 'var(--ledger-green)',
            }}
          />
        </header>

        <LoginForm />
      </div>
    </main>
  );
}
