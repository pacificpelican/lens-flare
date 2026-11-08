import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
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
      <Route path="/" element={isAuthenticated ? <Navigate to="/gallery" replace /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <AppRoutes />
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
