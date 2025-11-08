import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './App.css';

/** Small reload button used by the error boundary */
function ReloadButton() {
  return (
    <button
      onClick={() => location.reload()}
      style={{
        background: '#6366f1',
        color: '#0a0a0a',
        border: '1px solid #4f46e5',
        padding: '10px 14px',
        borderRadius: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Reload
    </button>
  );
}

/** Minimal error boundary so production never goes black */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // Keep the error visible in the browser console for debugging
    console.error('App crashed:', err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#0a0a0a',
            color: '#e5e5e5',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ opacity: 0.8, marginBottom: 16 }}>
              Please refresh and try again. The error is logged in the console.
            </p>
            <ReloadButton />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
