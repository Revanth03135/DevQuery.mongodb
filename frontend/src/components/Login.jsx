import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', formData);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        // Small delay to ensure state is updated before navigation
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        // Handle non-success responses
        const errorMsg = response.data?.message || 'Invalid credentials';
        setError(errorMsg);
        console.error('Login failed:', errorMsg);
      }
    } catch (err) {
      // Handle different error types
      let errorMessage = 'Invalid credentials';
      
      if (err.response?.status === 401) {
        errorMessage = 'Invalid credentials';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Invalid email or password';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Login error:', err.response?.data || err.message);
      
      // Keep error visible for 5 seconds minimum, then allow it to be dismissed
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <form id="loginForm" onSubmit={handleSubmit}>
          <h2>Login to DevQuery</h2>

          {error && (
            <div className="error-message" role="alert">
              ⚠️ {error}
            </div>
          )}

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>

          <p className="signup-link">
            Don't have an account?{' '}
            <Link to="/signup">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
