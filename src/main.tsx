import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './App.css';

/* -----------------------------------------------------------------------------
   Global error capture
   - Catches both render-time errors (via ErrorBoundary) and async errors
     (unhandled Promise rejections / window errors) so the app never goes black.
----------------------------------------------------------------------------- */

type AppError = { message: string; stack?: string };

function normalizeError(e: unknown): AppError {
  const errLike: any =
    (e &&
      typeof e === 'object' &&
      ('reason' in (e as any) ? (e as any).reason : (e as any).error)) ?? e;

  if (errLike instanceof Error) {
    return { message: errLike.message, stack: errLike.stack };
  }
  if (typeof errLike === 'string') {
    return { message: errLike };
  }
  try {
    return { message: JSON.stringify(errLike) };
  } catch {
    return { message: String(errLike) };
  }
}

function migrateErrorKey() {
  try {
    const legacy = sessionStorage.getItem('cr_last_error');
    if (legacy && !sessionStorage.getItem('ln_last_error')) {
      sessionStorage.setItem('ln_last_error', legacy);
    }
  } catch {
    /* ignore */
  }
}

function installGlobalErrorHooks() {
  migrateErrorKey();
  const push = (evt: any) => {
    try {
      const err = normalizeError(evt);
      sessionStorage.setItem('ln_last_error', JSON.stringify(err));
      // eslint-disable-next-line no-console
      console.error('[GlobalError]', err);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('unhandledrejection', push);
  window.addEventListener('error', push);
}
installGlobalErrorHooks();

/* -----------------------------------------------------------------------------
   Crash screen component used by the ErrorBoundary
----------------------------------------------------------------------------- */

function CrashScreen({ error }: { error: AppError }) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        color: 'var(--fg)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ opacity: 0.8, margin: '0 0 16px' }}>
          Please refresh and try again. The error is also logged in the console.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => location.reload()}
            style={{
              borderRadius: 12,
              background: '#7c3aed',
              color: '#ffffff',
              padding: '10px 16px',
              fontWeight: 700,
              border: '1px solid #6d28d9',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <button
            onClick={() => setShowDetails((s) => !s)}
            style={{
              borderRadius: 12,
              background: 'transparent',
              color: 'var(--fg)',
              padding: '10px 16px',
              fontWeight: 700,
              border: '1px solid rgba(0,0,0,0.18)',
              cursor: 'pointer',
            }}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {showDetails && (
          <pre
            style={{
              marginTop: 16,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.12)',
              color: 'var(--fg)',
              padding: 16,
              borderRadius: 12,
              overflow: 'auto',
              maxHeight: '40vh',
              fontSize: 12,
            }}
          >
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        )}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Error Boundary: catches render/lifecycle errors so the app never blanks.
----------------------------------------------------------------------------- */

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: AppError | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err: unknown) {
    return { err: normalizeError(err) };
  }
  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    const normalized = normalizeError(err);
    // eslint-disable-next-line no-console
    console.error('App crashed:', normalized, info);
    try {
      sessionStorage.setItem('ln_last_error', JSON.stringify(normalized));
    } catch {
      /* ignore */
    }
  }
  render() {
    if (this.state.err) {
      return <CrashScreen error={this.state.err} />;
    }
    return this.props.children;
  }
}

/* -----------------------------------------------------------------------------
   Mount
----------------------------------------------------------------------------- */

const rootEl = document.getElementById('root');
if (!rootEl) {
  // eslint-disable-next-line no-console
  console.error('Root element #root not found. Did index.html change?');
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
