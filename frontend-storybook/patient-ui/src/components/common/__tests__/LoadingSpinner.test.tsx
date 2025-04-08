import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    // Check if loading message is present
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Check if spinner element exists
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Check if screen reader text is present
    expect(screen.getByText('Loading')).toBeInTheDocument();
    
    // Check if medium size class is applied
    const spinner = screen.getByRole('status').querySelector('div');
    expect(spinner).toHaveClass('w-8 h-8');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="large" />);
    
    const spinner = screen.getByRole('status').querySelector('div');
    expect(spinner).toHaveClass('w-12 h-12');
  });

  it('renders with custom message', () => {
    const message = 'Custom loading message';
    render(<LoadingSpinner message={message} />);
    
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const customClass = 'custom-class';
    render(<LoadingSpinner className={customClass} />);
    
    expect(screen.getByRole('status')).toHaveClass(customClass);
  });

  it('renders without message when message prop is empty', () => {
    render(<LoadingSpinner message="" />);
    
    // Should only find the screen reader text
    const loadingTexts = screen.getAllByText(/loading/i);
    expect(loadingTexts).toHaveLength(1);
    expect(loadingTexts[0]).toHaveClass('sr-only');
  });
}); 