import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from '../search/GlobalSearch';
// import { FaSearch, FaUserCircle, FaSignOutAlt } from 'react-icons/fa'; // Optional icons
import { AuthContext } from '../../context/AuthContext'; // Adjust path as needed

const TopBar: React.FC = () => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    // Or return a minimal TopBar if it can render without auth context
    throw new Error('TopBar must be used within an AuthProvider');
  }
  const { user, logout } = authContext;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            {/* Logo or brand name */}
            <span className="text-xl font-semibold text-gray-900">Patient Database</span>
          </div>

          <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
            <GlobalSearch />
          </div>

          <div className="flex items-center">
            {/* User profile dropdown */}
            <div className="ml-4 relative flex-shrink-0">
              <button
                onClick={handleLogout}
                className="bg-gray-100 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">User menu</span>
                <svg
                  className="h-8 w-8"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
