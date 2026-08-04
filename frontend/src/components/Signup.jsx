import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

function Signup({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
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

    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!formData.username && !formData.fullName) {
      setError('Please enter either a username or full name');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/auth/register', formData);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.details || err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      console.error('Registration error details:', err.response?.data);
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

        <form id="signupForm" onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          {error && <div className="error-message">{error}</div>}

          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="johndoe"
            value={formData.username}
            onChange={handleChange}
            required
          />

          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="fullName"
            placeholder="John Doe"
            value={formData.fullName}
            onChange={handleChange}
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="At least 6 characters"
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

          <button type="submit" disabled={loading || !formData.email || !formData.password || (!formData.username && !formData.fullName)}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <p className="signup-link">
            Already have an account?{' '}
            <Link to="/login">Log In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;
