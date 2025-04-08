import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isLoading, error } = useMutation(
    (email: string) => authService.requestPasswordReset(email),
    {
      onSuccess: () => {
        setSubmitted(true);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(email);
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Check Your Email</h2>
          <p>
            If an account exists for {email}, you will receive password reset
            instructions.
          </p>
          <Link to="/login" className="primary-button">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p>Enter your email address to receive password reset instructions.</p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {(error as Error).message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </button>

          <div className="auth-links">
            <Link to="/login">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}; 