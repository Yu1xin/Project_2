'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          background: '#fafafa',
          gap: 16,
        }}>
          <p style={{ fontSize: 18, color: '#71717a' }}>pls relod</p>
          <button
            onClick={reset}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid #d4d4d8',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              color: '#3f3f46',
            }}
          >
            reload
          </button>
        </div>
      </body>
    </html>
  );
}
