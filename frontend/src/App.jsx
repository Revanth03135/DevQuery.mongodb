import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './utils/api';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  return (
    <ThemeProvider>
      <AppContent user={user} setUser={setUser} loading={loading} setLoading={setLoading} />
    </ThemeProvider>
  );
}

function AppContent({ user, setUser, loading, setLoading }) {
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token with backend
      api.get('/api/auth/validate')
        .then(response => {
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(error => {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container" style={{ textAlign: 'center', maxWidth: '320px', padding: '40px 24px' }}>
          <div className="loading-spinner" style={{ marginBottom: '16px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent-cyan)' }}></i>
          </div>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.1rem' }}>DevQuery</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Authenticating user...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/home" element={<Home user={user} />} />
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={!user ? <Signup setUser={setUser} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" replace />} />
          <Route path="/analytics" element={user ? <Analytics user={user} setUser={setUser} /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
