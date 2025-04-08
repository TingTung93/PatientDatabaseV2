import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="app-layout">
      <nav className="main-nav">
        <div className="nav-brand">
          <Link to="/">Patient Database</Link>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/" className={isActive('/') ? 'active' : ''}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/patients" className={isActive('/patients') ? 'active' : ''}>
              Patients
            </Link>
          </li>
          <li>
            <Link to="/caution-cards" className={isActive('/caution-cards') ? 'active' : ''}>
              Caution Cards
            </Link>
          </li>
          <li>
            <Link to="/reports" className={isActive('/reports') ? 'active' : ''}>
              Reports
            </Link>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        {children}
      </main>

      <footer className="main-footer">
        <p>&copy; {new Date().getFullYear()} Patient Database System</p>
      </footer>
    </div>
  );
}; 