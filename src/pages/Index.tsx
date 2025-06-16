
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import LoginPage from '@/components/auth/LoginPage';
import Dashboard from '@/components/dashboard/Dashboard';
import MeterReadingForm from '@/components/forms/MeterReadingForm';
import ReportsPage from '@/components/reports/ReportsPage';
import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';

const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/meter-reading" element={<MeterReadingForm />} />
      <Route path="/reports" element={<ReportsPage />} />
      {user.role === 'admin' && (
        <Route path="/users" element={<UserManagement />} />
      )}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const Index = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Router>
              <AppRoutes />
            </Router>
            <Toaster />
          </div>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default Index;
