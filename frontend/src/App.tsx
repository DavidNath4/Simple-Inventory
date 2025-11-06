import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, NotificationProvider, useAuth } from './contexts';
import { ProtectedRoute, Layout, ToastContainer, ErrorBoundary } from './components';
import { Dashboard, Inventory, Admin, Login } from './pages';
import { useApiService } from './hooks';

const AppContent: React.FC = () => {
  // Initialize API service with global error handling
  useApiService();

  return (
    <Router>
      <div className='App'>
        <AppRoutes />
        <ToastContainer />
      </div>
    </Router>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path='/login'
        element={
          isAuthenticated ? <Navigate to='/dashboard' replace /> : <Login />
        }
      />
      <Route
        path='/dashboard'
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/inventory'
        element={
          <ProtectedRoute>
            <Layout>
              <Inventory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin'
        element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Admin />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path='/'
        element={
          <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
        }
      />
      <Route
        path='*'
        element={
          <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
