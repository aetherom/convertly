import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-200 max-w-md text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-3">Something went wrong</h2>
            <p className="text-slate-600 mb-6 break-words">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => (window.location.href = '/')} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
