import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  LogOut, 
  MoreVertical, 
  MessageSquare, 
  Calendar,
  Clock,
  FileText, 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  
  const tabs = [
    { id: 'dashboard', name: 'Tableau de bord', path: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'discussions', name: 'Discussions', path: '/discussions', icon: <MessageSquare className="h-5 w-5" /> },
    { id: 'appointments', name: 'Rendez-Vous', path: '/appointments', icon: <Calendar className="h-5 w-5" /> },
    { id: 'date-management', name: 'Gestion des dates', path: '/date-management', icon: <Clock className="h-5 w-5" /> },
    { id: 'quotes', name: 'Devis', path: '/quotes', icon: <FileText className="h-5 w-5" /> },
    { id: 'settings', name: 'Paramètres', path: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/discussions' && location.pathname.startsWith('/chat')) return true;
    return location.pathname === path;
  };

  return (
    <div className="h-full flex flex-col border-r border-whatsapp-border bg-gradient-to-b from-[#1a1a1a] to-[#2d2d2d]">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-gradient-to-r from-[#2d2d2d] to-[#1a1a1a] relative">
        <div className="flex items-center">
          <div className="relative">
            <img
              src={user?.avatar_url}
              alt="Profile"
              className="w-10 h-10 rounded-full ring-2 ring-whatsapp-green ring-offset-2 ring-offset-[#1a1a1a]"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-whatsapp-green rounded-full border-2 border-[#1a1a1a]"></div>
          </div>
          {!isCollapsed && <span className="ml-3 font-medium text-white">{user?.name}</span>}
        </div>
        <div className="flex items-center space-x-3">
          {!isCollapsed && (
            <>
              <button onClick={logout} className="text-gray-400 hover:text-white transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </>
          )}
          <button 
            onClick={onToggle}
            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-whatsapp-green to-emerald-600 text-white rounded-full p-1.5 shadow-lg hover:from-emerald-600 hover:to-whatsapp-green transition-all duration-300"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Vertical Tabs */}
      <div className="flex-1 border-b border-gray-700">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`flex items-center py-3 px-4 transition-all duration-200 ${
              isActive(tab.path)
                ? 'bg-gradient-to-r from-whatsapp-green/20 to-transparent text-whatsapp-green border-l-4 border-whatsapp-green'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              {tab.icon}
              {!isCollapsed && (
                <span className={`ml-3 font-medium transition-all duration-200 ${
                  isActive(tab.path) ? 'text-whatsapp-green' : 'text-gray-400 group-hover:text-white'
                }`}>
                  {tab.name}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;