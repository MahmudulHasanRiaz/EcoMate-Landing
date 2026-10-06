'use client';

/**
 * Root error boundary (Task 20 §1).
 *
 * Renders when the layout itself fails, so it owns its own <html><body> and
 * imports nothing from the layout (no fonts, no pixel, no JSON-LD). Inline
 * styles only — a stylesheet import here would re-enter the failed tree.
 */

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#07080E',
          color: '#f1f5f9',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <main style={{ maxWidth: 560, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#a5b4fc' }}>
            ECOMATE — SOMETHING WENT WRONG
          </p>
          <h1 style={{ fontSize: 32, margin: '12px 0' }}>Please try again</h1>
          <p style={{ fontSize: 14, color: '#cbd5e1' }}>
            The page could not be rendered. Reloading usually fixes it — or
            contact us directly on WhatsApp and we will help.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 0,
                borderRadius: 12,
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20the%20site%20showed%20an%20error."
              style={{
                color: '#6ee7b7',
                border: '1px solid #065f46',
                borderRadius: 12,
                padding: '12px 20px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              WhatsApp us
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
