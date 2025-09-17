import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SupabaseAuth from "./components/SupabaseAuth";
import AuthCallback from "./pages/AuthCallback";
import EmailAppSupabase from "./components/EmailAppSupabase";
import { useAuth } from "./hooks/useAuth";

function AppContent() {
  const { user, loading } = useAuth();

  // Clear any old OAuth tokens from the custom service
  React.useEffect(() => {
    localStorage.removeItem('oauth_token');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Authentication Routes */}
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <SupabaseAuth />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={user ? <EmailAppSupabase /> : <Navigate to="/auth" replace />}
      />

      {/* Redirect any unknown routes */}
      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/auth"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;
