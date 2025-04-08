import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string>('');

  const { mutate, isLoading } = useMutation(
    (password: string) => authService.resetPassword(token!, password),
    {
      onSuccess: () => {
        navigate('/login', {
          state: { message: 'Password has been reset successfully. Please log in.' },
        });
      },
      onError: (error: Error) => {
        setError(error.message);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or expired reset token');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    mutate(formData.password);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Invalid Reset Link</h2>
          <p>This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="primary-button">
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Your Password</h2>
        <p>Please enter your new password below.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>

          <div className="auth-links">
            <Link to="/login">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}; 