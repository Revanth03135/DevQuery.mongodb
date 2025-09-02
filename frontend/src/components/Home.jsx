import { Link } from 'react-router-dom';
import { useState } from 'react';
import './Home.css';

function Home({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTryDevQuery = () => {
    if (user) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/login';
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <img src="/img1.png" alt="DevQuery Logo" />
          <span>DevQuery</span>
        </div>
        
        {/* Mobile menu button */}
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <i className="fas fa-bars"></i>
        </button>

        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <li><Link className="active" to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
          <li><a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
          <li><a href="#docs" onClick={() => setMobileMenuOpen(false)}>Docs</a></li>
          <li><Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link></li>
          <li><Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link></li>
          <li><Link to="/signup" className="signup-btn" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link></li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <h1>LLM-Powered SQL & Code Intelligence</h1>
        <p>Convert natural language to SQL and auto-document your codebase effortlessly.</p>
        <div className="cta-buttons">
          {user ? (
            <Link to="/dashboard" className="cta-button primary">Go to Dashboard</Link>
          ) : (
            <Link to="/login" className="cta-button primary">Try DevQuery</Link>
          )}
          <a href="#features" className="cta-button secondary">Learn More</a>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <h2>Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-language"></i>
              </div>
              <h3>Natural Language to SQL</h3>
              <p>Convert plain English descriptions into optimized SQL queries instantly using advanced AI.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-database"></i>
              </div>
              <h3>Multi-Database Support</h3>
              <p>Connect to MySQL, PostgreSQL, SQLite, SQL Server, and Oracle databases seamlessly.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h3>Query Analytics</h3>
              <p>Analyze query performance, get suggestions, and track your database usage patterns.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-save"></i>
              </div>
              <h3>Query Management</h3>
              <p>Save, organize, and share your queries with team members for better collaboration.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-sitemap"></i>
              </div>
              <h3>Schema Explorer</h3>
              <p>Visualize database structures and relationships with an intuitive schema browser.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-code"></i>
              </div>
              <h3>Code Documentation</h3>
              <p>Automatically generate documentation for your codebase with AI-powered analysis.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="docs" className="docs-preview">
        <h2>📚 Docs</h2>
        <div className="doc-grid">
          <div className="doc-card">
            <h3>Introduction</h3>
            <p>Get an overview of how DevQuery helps developers generate SQL with ease.</p>
          </div>
          <div className="doc-card">
            <h3>Setup</h3>
            <p>Install dependencies, connect your database, and configure your environment.</p>
          </div>
          <div className="doc-card">
            <h3>Usage</h3>
            <p>Start using DevQuery by logging in and entering your query prompts.</p>
          </div>
          <div className="doc-card">
            <h3>API Reference</h3>
            <p>Explore available endpoints, authentication, and request formats.</p>
          </div>
          <div className="doc-card">
            <h3>FAQs</h3>
            <p>Common questions answered: from login issues to advanced usage.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>&copy; 2025 DevQuery. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
