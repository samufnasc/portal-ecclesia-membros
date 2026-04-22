import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if session exists (simplified)
    const session = localStorage.getItem('portal_session');
    if (session) {
      setIsAuthenticated(true);
    }
    setIsReady(true);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('portal_session', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_session');
    setIsAuthenticated(false);
  };

  if (!isReady) return null;

  return (
    <main className="min-h-screen">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </main>
  );
}
