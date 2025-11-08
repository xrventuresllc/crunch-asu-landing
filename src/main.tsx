import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './App.css';

/** Minimal error boundary so production never goes black */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; err?: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, err: undefined };
  }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, err };
  }
  componentDidCatch(err: unknown, info: unknown) {
    // Keep the error visible in the browser console for debugging
    // eslint-disable-next-line no-console
    console.error('App crashed:', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            color: '#e5e5e5',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ opacity: 0.8, marginBottom: 16 }}>
              Please refresh and try again. The error is logged in the console.
            </p>
            <button
              onClick={() => location.reload()}
              style={{
                borderRadius: 10,
                background: '#6366f1',
                color: '#0a0a0a',
                padding: '10px 14px',
                fontWeight: 700,
                border: '1px solid #4f46e5',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </RootErrorBoundary>
);
