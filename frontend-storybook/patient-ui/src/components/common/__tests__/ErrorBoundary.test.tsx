import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Prevent console.error from cluttering test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error details')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const fallback = <div>Custom error message</div>;
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('calls onError when error occurs', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Test error');
  });

  it('resets error state when try again button is clicked', () => {
    const TestComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      React.useEffect(() => {
        // After first render, set shouldThrow to false
        setShouldThrow(false);
      }, []);

      if (shouldThrow) {
        throw new Error('Test error');
      }

      return <div>Recovered from error</div>;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Initially shows error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click try again
    fireEvent.click(screen.getByText('Try again'));

    // Should show recovered state
    expect(screen.getByText('Recovered from error')).toBeInTheDocument();
  });
}); 