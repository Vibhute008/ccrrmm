
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { UIProvider } from './context/UIContext';
import Login from './pages/Login';
import BossPanel from './pages/boss/BossPanel';
import TelecallerPanel from './pages/telecaller/TelecallerPanel';
import SalesManagerPanel from './pages/sales/SalesManagerPanel';
import TechLeadPanel from './pages/tech/TechLeadPanel';
import Sidebar from './components/Sidebar';
import { UserRole } from './types';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" />;
  }

  // Boss can access everything, others restricted
  if (user.role !== UserRole.BOSS && !allowedRoles.includes(user.role)) {
    // Redirect to their default panel
    switch (user.role) {
      case UserRole.SALES_MANAGER: return <Navigate to="/sales" />;
      case UserRole.TELECALLER: return <Navigate to="/telecaller" />;
      case UserRole.TECH_LEAD: return <Navigate to="/tech" />;
      default: return <Navigate to="/" />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route 
        path="/boss" 
        element={
          <PrivateRoute allowedRoles={[UserRole.BOSS]}>
            <BossPanel />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/telecaller" 
        element={
          <PrivateRoute allowedRoles={[UserRole.TELECALLER, UserRole.BOSS]}>
            <TelecallerPanel />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/sales" 
        element={
          <PrivateRoute allowedRoles={[UserRole.SALES_MANAGER, UserRole.BOSS]}>
            <SalesManagerPanel />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/tech" 
        element={
          <PrivateRoute allowedRoles={[UserRole.TECH_LEAD, UserRole.BOSS]}>
            <TechLeadPanel />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <DataProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </DataProvider>
      </UIProvider>
    </AuthProvider>
  );
}