import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-whatsapp-panel">
      <div className={`fixed top-0 left-0 h-full z-10 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-[300px]'}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      </div>
      <div className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-[300px]'}`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;