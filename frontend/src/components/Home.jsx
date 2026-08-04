import { Link } from 'react-router-dom';
import { useState } from 'react';
import './Home.css';

function Home({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <li><a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a></li>
          <li><Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link></li>
          <li><Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link></li>
          <li><Link to="/signup" className="signup-btn" onClick={() => setMobileMenuOpen(false)}>Get Started</Link></li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Transform Natural Language into Powerful SQL Queries</h1>
          <p className="hero-subtitle">
            DevQuery uses AI to convert your plain English questions into optimized SQL.
            Connect any database and start querying in seconds — no SQL expertise required.
          </p>
          <div className="cta-buttons">
            {user ? (
              <Link to="/dashboard" className="cta-button primary">
                <span>Go to Dashboard</span>
                <i className="fas fa-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/signup" className="cta-button primary">
                <span>Start Free</span>
                <i className="fas fa-arrow-right"></i>
              </Link>
            )}
            <a href="#features" className="cta-button secondary">
              <i className="fas fa-play"></i>
              <span>See How It Works</span>
            </a>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="hero-image-wrapper">
          <div className="hero-dashboard-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="preview-title">DevQuery Dashboard</span>
            </div>
            <div className="preview-content">
              <div className="preview-chat">
                <div className="preview-msg user">"Show me all orders from last month"</div>
                <div className="preview-msg bot">
                  <code>SELECT * FROM orders WHERE created_at &gt;= DATE_SUB(NOW(), INTERVAL 1 MONTH);</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Designed For Section */}
      <section className="audience-section">
        <div className="container">
          <h2>Designed For</h2>
          <div className="audience-orbit">
            {/* Orbit Rings */}
            <div className="orbit-ring ring-1"></div>
            <div className="orbit-ring ring-2"></div>
            <div className="orbit-ring ring-3"></div>

            {/* Rotating Lines */}
            <div className="orbit-lines">
              <div className="orbit-line line-1"></div>
              <div className="orbit-line line-2"></div>
              <div className="orbit-line line-3"></div>
              <div className="orbit-line line-4"></div>
            </div>

            {/* Center Logo */}
            <div className="orbit-center">
              <div className="orbit-glow"></div>
              <img src="/img1.png" alt="DevQuery" />
            </div>

            {/* Orbit Items */}
            <div className="orbit-item top-right">
              <span className="orbit-dot"></span>
              <span>Developers</span>
            </div>
            <div className="orbit-item top-left">
              <span className="orbit-dot"></span>
              <span>Data Analysts</span>
            </div>
            <div className="orbit-item bottom-right">
              <span className="orbit-dot"></span>
              <span>Startups</span>
            </div>
            <div className="orbit-item bottom-left">
              <span className="orbit-dot"></span>
              <span>Enterprise Teams</span>
            </div>

            {/* Floating Particles */}
            <div className="orbit-particle p1"></div>
            <div className="orbit-particle p2"></div>
            <div className="orbit-particle p3"></div>
            <div className="orbit-particle p4"></div>
          </div>
          <p className="audience-tagline">And anyone who wants to query databases without writing SQL.</p>
        </div>
      </section>

      {/* Bento Features Section */}
      <section className="features" id="features">
        <div className="container">
          <h2>Core Intelligence</h2>
          <p className="section-subtitle">Everything you need to query databases like a pro.</p>

          <div className="bento-grid">
            <div className="bento-card large">
              <div className="bento-icon">
                <i className="fas fa-language"></i>
              </div>
              <h3>Natural Language to SQL</h3>
              <p>Just type what you want to know. DevQuery's AI understands your intent and generates optimized SQL queries instantly.</p>
              <ul className="bento-list">
                <li><i className="fas fa-check-circle"></i> Understands complex queries</li>
                <li><i className="fas fa-check-circle"></i> Handles joins automatically</li>
                <li><i className="fas fa-check-circle"></i> Optimizes for performance</li>
              </ul>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-database"></i>
              </div>
              <h3>Multi-Database</h3>
              <p>Connect MySQL, PostgreSQL, MongoDB, SQL Server, and more with a single interface.</p>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-sitemap"></i>
              </div>
              <h3>Schema Explorer</h3>
              <p>Visualize your database structure, browse tables, and understand relationships at a glance.</p>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h3>Query Analytics</h3>
              <p>Track query performance, execution times, and get suggestions for optimization.</p>
            </div>

            <div className="bento-card large">
              <div className="bento-icon">
                <i className="fas fa-robot"></i>
              </div>
              <h3>AI Chat Assistant</h3>
              <p>Have a conversation with your data. Ask follow-up questions, get explanations, and explore your database naturally.</p>
              <div className="bento-tip">
                <span className="tip-label">💡 Example</span>
                <span className="tip-text">"Which products sold the most last quarter?"</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>Simple 3-Step Flow</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-illustration">
                <div className="step-icon-large">
                  <i className="fas fa-plug"></i>
                </div>
              </div>
              <div className="step-content">
                <div className="step-icon-small">
                  <i className="fas fa-plug"></i>
                </div>
                <h3>Connect Your Database</h3>
                <p>Add your database credentials securely. We support all major databases.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-illustration">
                <div className="step-icon-large">
                  <i className="fas fa-comment-dots"></i>
                </div>
              </div>
              <div className="step-content">
                <div className="step-icon-small">
                  <i className="fas fa-comment-dots"></i>
                </div>
                <h3>Ask in Plain English</h3>
                <p>Type your question naturally. No SQL knowledge required.</p>
              </div>
            </div>

            <div className="step-card highlight">
              <div className="step-illustration">
                <div className="step-icon-large">
                  <i className="fas fa-bolt"></i>
                </div>
              </div>
              <div className="step-content">
                <div className="step-icon-small">
                  <i className="fas fa-bolt"></i>
                </div>
                <h3>Get Instant Results</h3>
                <p>Receive optimized SQL and query results in seconds.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <h2>Word of Praise</h2>
          <div className="testimonial-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p className="testimonial-quote">"DevQuery has transformed how our team interacts with databases. No more waiting for data analysts — everyone can get insights instantly."</p>
              <div className="testimonial-author">
                <div className="author-avatar initials" style={{ background: 'linear-gradient(135deg, #34F5C5, #3E9CFF)', color: '#0f1118', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%' }}>
                  SC
                </div>
                <div>
                  <strong>Sarah Chen</strong>
                  <span>Engineering Lead, TechCorp</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-stars">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p className="testimonial-quote">"The AI understands exactly what I need. I've saved hours every week by not having to write complex SQL queries manually."</p>
              <div className="testimonial-author">
                <div className="author-avatar initials" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%' }}>
                  MJ
                </div>
                <div>
                  <strong>Marcus Johnson</strong>
                  <span>Data Analyst, StartupX</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-stars">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p className="testimonial-quote">"Schema explorer and automatic documentation generation are game changers. Finally, a tool that understands what developers actually need."</p>
              <div className="testimonial-author">
                <div className="author-avatar initials" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%' }}>
                  ER
                </div>
                <div>
                  <strong>Emily Rodriguez</strong>
                  <span>Full-Stack Developer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta">
        <div className="container">
          <h2>Ready to Query Smarter?</h2>
          <p>Join thousands of developers who've simplified their database workflows.</p>
          <div className="cta-buttons">
            {user ? (
              <Link to="/dashboard" className="cta-button primary">
                <span>Open Dashboard</span>
                <i className="fas fa-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/signup" className="cta-button primary">
                <span>Get Started Free</span>
                <i className="fas fa-arrow-right"></i>
              </Link>
            )}
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
