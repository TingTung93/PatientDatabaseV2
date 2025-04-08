import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <div className="error-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <div className="actions">
          <Link to="/" className="primary-button">
            Return to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="secondary-button"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}; 