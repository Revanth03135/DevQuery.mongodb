import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

function Signup({ setUser }) {
  const [formData, setFormData] = useState({
    name: '',
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
      // The 'formData' object with name, email, and password is sent
      const response = await api.post('/api/auth/register', formData);

      // FIX: Check for the actual data returned by the backend
      if (response.data && response.data.token) {
        // Save the entire user object (which includes the token)
        localStorage.setItem('user', JSON.stringify(response.data));
        
        // This function will update your global state
        setUser(response.data); 
        
        navigate('/dashboard');
      }
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

          {error && <div className="error-message">{error}</div>}

          <label htmlFor="name">Name</label> {/* Changed label */}
              <input
                type="text"
                id="name" 
                name="name"               // <-- Fixed: Changed to "name"
                value={formData.name}      // <-- Fixed: Changed to formData.name
                onChange={handleChange}
                required
          />

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
