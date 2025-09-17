import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OAuthLogin from './components/OAuthLogin';
import AuthSuccess from './pages/AuthSuccess';
import AuthError from './pages/AuthError';
import EmailApp from './components/EmailApp';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* OAuth Authentication Routes */}
          <Route path="/auth" element={<OAuthLogin />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/error" element={<AuthError />} />
          
          {/* Main Application Route */}
          <Route path="/" element={<EmailApp />} />
          
          {/* Redirect any unknown routes to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
