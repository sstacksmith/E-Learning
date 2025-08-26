'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl mx-auto text-center">
            
            {/* Główna ikona z animacją */}
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-orange-200 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>
              
              {/* Animowane kropki */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>

            {/* Tytuł i opis */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Wystąpił błąd
            </h2>
            
            <p className="text-lg text-gray-600 mb-6">
              Przepraszamy, wystąpił nieoczekiwany błąd podczas ładowania strony.
              Spróbuj odświeżyć stronę lub wróć do strony głównej.
            </p>

            {/* Szczegóły błędu */}
            {this.state.error && (
              <details className="text-left mb-6 bg-white p-4 rounded-lg border border-red-200 max-w-lg mx-auto">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium mb-2">
                  📋 Szczegóły błędu
                </summary>
                <pre className="text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto text-left">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Przyciski akcji */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 font-medium transform hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                Spróbuj ponownie
              </button>
              
              <button
                onClick={() => window.location.href = '/homelogin'}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2 font-medium"
              >
                <Home className="w-4 h-4" />
                Strona główna
              </button>
            </div>

            {/* Dodatkowe informacje */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-lg mx-auto">
              <p className="text-sm text-blue-700">
                💡 <strong>Wskazówka:</strong> Jeśli problem się powtarza, 
                spróbuj wyczyścić cache przeglądarki lub skontaktuj się z zespołem wsparcia.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
