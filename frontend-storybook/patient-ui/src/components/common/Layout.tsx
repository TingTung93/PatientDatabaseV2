import React, { ReactNode } from 'react';
import Sidebar from './Sidebar'; // Import the Sidebar component
import TopBar from './TopBar';   // Import the TopBar component

interface LayoutProps {
  children: ReactNode;
}

// Updated Layout component using Sidebar and TopBar
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden"> {/* Added overflow-hidden */} 
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area including TopBar and page content */}
      <div className="flex-1 flex flex-col overflow-hidden"> 
        {/* Top Bar */}
        <TopBar />

        {/* Page content area */}
        {/* Added padding and made it scrollable */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-6"> {/* Changed padding */} 
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 