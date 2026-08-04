import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
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
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        const errorMsg = response.data?.message || 'Invalid credentials';
        setError(errorMsg);
        console.error('Login failed:', errorMsg);
      }
    } catch (err) {
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
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="auth-logo">
          <img src="/img1.png" alt="DevQuery Logo" />
          <span>DevQuery</span>
        </div>

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
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <label htmlFor="password" style={{ margin: 0 }}>Password</label>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => setError('Password reset instructions sent if email exists.')}>
              Forgot password?
            </span>
          </div>
          <div className="password-input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

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
