import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api'; // Make sure this import is correct (default export)
import './Auth.css';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 1. Add state for our simple success message
  const [successMessage, setSuccessMessage] = useState('');

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
    setSuccessMessage(''); // Clear old messages

    try {
      await api.post('/api/auth/register', formData);

      // 2. Set the success message text
      setSuccessMessage('User created successfully!');

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <form id="signupForm" onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          {/* 3. Display the green message here when it exists */}
          {successMessage && <p className="success-text">{successMessage}</p>}
          
          {error && <div className="error-message">{error}</div>}

          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={!!successMessage} // Optional: disable form on success
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={!!successMessage} // Optional: disable form on success
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={!!successMessage} // Optional: disable form on success
          />

          <button type="submit" disabled={loading || !!successMessage}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <p className="signup-link">
            Already have an account?
            <Link to="/login">Log In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;