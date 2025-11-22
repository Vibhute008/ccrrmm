
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { NavLink, useNavigate } from 'react-router-dom';
import { Phone, Briefcase, Code, LogOut, Shield } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  // Uniform styling
  const baseClass = "flex items-center p-3 rounded-lg transition-all duration-200 font-medium border-l-2 border-transparent";
  const activeClass = "bg-indigo-500/10 text-indigo-300 border-indigo-400 shadow-sm";
  const inactiveClass = "text-slate-300 hover:bg-slate-800 hover:text-white";

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl flex-shrink-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-indigo-400">RAULO ENT.</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">{user.name.toUpperCase()}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {user.role === UserRole.BOSS && (
          <NavLink to="/boss" className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
            <Shield size={20} className="mr-3" />
            <span>Boss Dashboard</span>
          </NavLink>
        )}

        {(user.role === UserRole.TELECALLER || user.role === UserRole.BOSS) && (
          <NavLink to="/telecaller" className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
            <Phone size={20} className="mr-3" />
            <span>Telecaller CRM</span>
          </NavLink>
        )}

        {(user.role === UserRole.SALES_MANAGER || user.role === UserRole.BOSS) && (
          <NavLink to="/sales" className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
            <Briefcase size={20} className="mr-3" />
            <span>Sales Manager</span>
          </NavLink>
        )}

        {(user.role === UserRole.TECH_LEAD || user.role === UserRole.BOSS) && (
          <NavLink to="/tech" className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
            <Code size={20} className="mr-3" />
            <span>Tech Projects</span>
          </NavLink>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        {/* User Profile */}
        <div className="flex items-center mb-4 px-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-inner border border-indigo-400/30">
            {user.name.charAt(0)}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate" title={user.email}>{user.email}</p>
          </div>
        </div>
        
        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-2.5 rounded-lg border border-slate-700 hover:bg-red-900/20 hover:border-red-800/50 text-slate-400 hover:text-red-400 text-xs font-bold transition-all group"
        >
          <LogOut size={16} className="mr-2 group-hover:scale-110 transition-transform" />
          SIGN OUT
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
