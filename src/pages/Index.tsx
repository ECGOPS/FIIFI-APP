import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import LoginPage from '@/components/auth/LoginPage';
import PasswordSetupPage from '@/components/auth/PasswordSetupPage';
import Dashboard from '@/components/dashboard/Dashboard';
import MeterReadingForm from '@/components/forms/MeterReadingForm';
import ReportsPage from '@/components/reports/ReportsPage';
import UserManagement from '@/components/admin/UserManagement';
import MapView from '@/components/map/MapView';
import { useAuth } from '@/contexts/AuthContext';
import AdminOptionsManager from '@/pages/AdminOptionsManager';

const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Only show password setup for non-admin users on their first login
  if (user.firstTimeLogin && user.role !== 'admin') {
    return <PasswordSetupPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/meter-reading" element={<MeterReadingForm />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/reports" element={<ReportsPage />} />
      {user.role === 'admin' && (
        <Route path="/users" element={<UserManagement />} />
      )}
      {user.role === 'admin' && (
        <Route path="/admin-options" element={<AdminOptionsManager />} />
      )}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineProvider>
          <Router>
            <AppRoutes />
            <Toaster />
          </Router>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
