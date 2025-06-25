import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import OfflineReadingSyncProvider from '../contexts/OfflineReadingSyncProvider';
import Dashboard from '@/components/dashboard/Dashboard';
import MeterReadingForm from '@/components/forms/MeterReadingForm';
// import Login from '@/components/auth/Login';
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { PhotoSyncProvider } from '@/contexts/PhotoSyncContext';

// Simple test component
const TestProvider = ({ children }: { children: React.ReactNode }) => {
  console.log('TestProvider: Component mounted');
  return <>{children}</>;
};

// Simple fallback component for Login
const LoginFallback = () => {
  console.log('LoginFallback: Component mounted');
  return <div>Login Page</div>;
};

function App() {
  console.log('App: Component mounting');
  return (
    <AuthProvider>
      <OfflineProvider>
        <TestProvider>
          <PhotoSyncProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LoginFallback />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/form" element={<MeterReadingForm />} />
                <Route path="/form/:id" element={<MeterReadingForm />} />
              </Routes>
            </Router>
          </PhotoSyncProvider>
        </TestProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App; 