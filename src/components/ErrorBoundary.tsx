
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { BookOpen } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-page flex items-center justify-center p-8">
          <div className="bg-surface rounded-2xl shadow-overlay max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-danger" />
            </div>
            <h1 className="text-xl font-bold text-fg mb-2">
              Что-то пошло не так
            </h1>
            <p className="text-muted text-sm mb-6">
              Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-accent text-accent-on rounded-xl hover:bg-accent-hover transition-colors font-medium"
            >
              Перезагрузить
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-muted cursor-pointer hover:text-fg">
                  Подробнее
                </summary>
                <pre className="mt-2 text-xs text-danger bg-danger/10 p-3 rounded-lg overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
