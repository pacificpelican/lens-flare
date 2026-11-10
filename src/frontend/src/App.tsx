import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { GalleryPage } from './pages/GalleryPage';
import { PhotoDetailPage } from './pages/PhotoDetailPage';
import { Footer } from './components/Footer';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/gallery" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/gallery" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/gallery" replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={isAuthenticated ? <Navigate to="/gallery" replace /> : <ResetPasswordPage />} />
      <Route
        path="/gallery"
        element={
          <ProtectedRoute>
            <GalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/photo/:photoId"
        element={
          <ProtectedRoute>
            <PhotoDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={isAuthenticated ? <Navigate to="/gallery" replace /> : <LandingPage />} />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  // Don't show global footer on landing page (has its own footer)
  const showFooter = location.pathname !== '/';

  return (
    <div className="app-container">
      <AppRoutes />
      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
