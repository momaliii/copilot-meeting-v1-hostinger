import React, { ErrorInfo, ReactNode } from 'react';
import i18n from '../i18n';

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  declare state: Readonly<State>;
  declare readonly props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const t = i18n.t.bind(i18n);
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">{t('error.title', 'Something went wrong')}</h1>
            <p className="text-slate-600 text-sm mb-6">
              {t('error.description', 'The page failed to load. Try refreshing or go back to the dashboard.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                {t('error.refresh', 'Refresh page')}
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                {t('error.goHome', 'Go to home')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
