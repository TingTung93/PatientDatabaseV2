import React from 'react';
import { NavLink } from 'react-router-dom';
// Consider adding an icon library like react-icons if desired
// import { FaUserInjured, FaFileMedicalAlt, FaExclamationTriangle } from 'react-icons/fa';

const Sidebar = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }): string =>
    `flex items-center px-4 py-2 mt-2 text-gray-100 hover:bg-gray-700 rounded ${
      isActive ? 'bg-gray-700' : ''
    }`;

  return (
    // Sidebar container - Adjust width, background, positioning as needed
    // Added responsive behavior: hidden on small screens, flex on medium+
    <aside className="hidden md:flex md:flex-col w-64 bg-gray-800">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        {/* Placeholder for Logo/App Name */}
        <span className="text-white font-bold uppercase">Patient DB</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        <NavLink to="/patients" className={navLinkClasses}>
          {/* <FaUserInjured className="mr-3" /> Optional Icon */}
          Patients
        </NavLink>
        <NavLink to="/reports" className={navLinkClasses}>
          {/* <FaFileMedicalAlt className="mr-3" /> Optional Icon */}
          Reports
        </NavLink>
        <NavLink to="/caution-cards" className={navLinkClasses}>
          {/* <FaExclamationTriangle className="mr-3" /> Optional Icon */}
          Caution Cards
        </NavLink>
        {/* Add more navigation links here as needed */}
      </nav>
    </aside>
  );
};

export default Sidebar; 