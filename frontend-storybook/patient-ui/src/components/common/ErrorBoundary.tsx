import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FallbackProps } from 'react-error-boundary';
import { FallbackError } from './FallbackError';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by error boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const fallbackProps: FallbackProps = {
        error: this.state.error!,
        resetErrorBoundary: this.resetErrorBoundary,
      };

      return <FallbackError {...fallbackProps} />;
    }

    return this.props.children;
  }
}
