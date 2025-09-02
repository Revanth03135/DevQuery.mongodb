import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import './Dashboard.css';
import logoImg from '../assets/img1.png';

function Dashboard({ user }) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('-- Your generated SQL will appear here\nSELECT * FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);');
  const [queryResults, setQueryResults] = useState([]);
  const [explanation, setExplanation] = useState('Generate a SQL query to see the explanation here.');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sql');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [dbConnection, setDbConnection] = useState(null);
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    type: '',
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  });
  const [estimatedRows, setEstimatedRows] = useState('--');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check for existing connections
    checkExistingConnections();
  }, [user, navigate]);

  useEffect(() => {
    // Add keyboard shortcuts
    const handleKeyboard = (e) => {
      // Ctrl+Enter to execute query
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteQuery();
      }
      
      // Ctrl+Shift+G to generate SQL
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        handleGenerateSQL();
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowDbModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, []);

  const checkExistingConnections = async () => {
    try {
      const response = await api.get('/api/database/connections');

      if (response.data.success && response.data.data?.connections?.length > 0) {
        const activeConnection = response.data.data.connections.find(conn => conn.status === 'connected');
        if (activeConnection) {
          setDbConnection(activeConnection);
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  };

  const handleGenerateSQL = async () => {
    if (!naturalLanguageInput.trim()) {
      showNotification('Please enter a description of what you want to query', 'warning');
      return;
    }

    setLoading(true);
    try {
      // If no database connection, use demo mode
      if (!dbConnection) {
        const demoSQL = generateDemoSQL(naturalLanguageInput);
        setGeneratedSQL(demoSQL.sql);
        setExplanation(demoSQL.explanation);
        setEstimatedRows(demoSQL.estimatedRows);
        setActiveTab('sql');
        showNotification('Demo SQL generated! Connect a database for AI-powered generation.', 'info');
        setLoading(false);
        return;
      }

      const response = await api.post(`/api/database/connections/${dbConnection?.connectionId}/generate-sql`, {
        naturalLanguage: naturalLanguageInput
      });

      if (response.data.success) {
        setGeneratedSQL(response.data.data.sql);
        setExplanation(response.data.data.explanation || 'SQL query generated successfully.');
        setEstimatedRows(response.data.data.estimatedRows || '~' + Math.floor(Math.random() * 1000));
        setActiveTab('sql');
        showNotification('SQL query generated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error generating SQL:', error);
      // Fallback to demo mode if backend fails
      const demoSQL = generateDemoSQL(naturalLanguageInput);
      setGeneratedSQL(demoSQL.sql);
      setExplanation(demoSQL.explanation);
      setEstimatedRows(demoSQL.estimatedRows);
      setActiveTab('sql');
      showNotification('Using demo mode - backend unavailable', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoSQL = (naturalLanguage) => {
    const input = naturalLanguage.toLowerCase();
    
    if (input.includes('users') && input.includes('month')) {
      return {
        sql: `SELECT u.id, u.name, u.email, u.created_at
FROM users u
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
ORDER BY u.created_at DESC;`,
        explanation: 'This query retrieves all users who registered in the last month, ordered by registration date.',
        estimatedRows: '~150'
      };
    } else if (input.includes('inventory') || input.includes('stock')) {
      return {
        sql: `SELECT p.id, p.name, p.stock_quantity, p.reorder_level
FROM products p
WHERE p.stock_quantity <= p.reorder_level
ORDER BY p.stock_quantity ASC;`,
        explanation: 'This query finds products with low inventory that need restocking.',
        estimatedRows: '~25'
      };
    } else if (input.includes('average') && input.includes('order')) {
      return {
        sql: `SELECT r.region_name, 
       AVG(o.total_amount) as avg_order_value,
       COUNT(o.id) as total_orders
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN regions r ON c.region_id = r.id
GROUP BY r.region_name
ORDER BY avg_order_value DESC;`,
        explanation: 'This query calculates the average order value by region with order counts.',
        estimatedRows: '~12'
      };
    } else if (input.includes('top') && input.includes('customers')) {
      return {
        sql: `SELECT c.id, c.name, c.email,
       SUM(o.total_amount) as total_revenue,
       COUNT(o.id) as total_orders
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.email
ORDER BY total_revenue DESC
LIMIT 10;`,
        explanation: 'This query finds the top 10 customers by total revenue generated.',
        estimatedRows: '10'
      };
    } else {
      return {
        sql: `-- Generated SQL query for: "${naturalLanguage}"
SELECT *
FROM table_name
WHERE condition = 'value'
ORDER BY created_at DESC
LIMIT 100;`,
        explanation: `This is a general SQL template for your query: "${naturalLanguage}". Connect a database for AI-powered generation.`,
        estimatedRows: '~100'
      };
    }
  };

  const handleExecuteQuery = async () => {
    if (!generatedSQL.trim() || generatedSQL === '-- Your generated SQL will appear here\nSELECT * FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);') {
      showNotification('Please generate or enter a SQL query first', 'warning');
      return;
    }

    // If no database connection, show demo results
    if (!dbConnection) {
      const demoResults = generateDemoResults();
      setQueryResults(demoResults);
      setActiveTab('results');
      showNotification('Demo results displayed! Connect a database for real data.', 'info');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/database/connections/${dbConnection.connectionId}/query`, {
        sql: generatedSQL
      });

      if (response.data.success) {
        setQueryResults(response.data.data.results || []);
        setActiveTab('results');
        showNotification('Query executed successfully!', 'success');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      showNotification('Failed to execute query. Please check your SQL syntax.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoResults = () => {
    // Generate mock results based on current SQL
    const columns = ['id', 'name', 'email', 'created_at', 'status'];
    const rows = [];
    
    for (let i = 1; i <= 15; i++) {
      rows.push({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: Math.random() > 0.5 ? 'Active' : 'Inactive'
      });
    }
    
    return rows;
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(generatedSQL)
      .then(() => {
        showNotification('SQL copied to clipboard!', 'success');
      })
      .catch(() => {
        showNotification('Failed to copy SQL to clipboard', 'error');
      });
  };

  const handleConnectDatabase = () => {
    setShowDbModal(true);
  };

  const handleDbConfigChange = (field, value) => {
    setDbConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    if (!dbConfig.type || !dbConfig.host || !dbConfig.database || !dbConfig.username) {
      showNotification('Please fill in all required fields', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/database/test-connection', dbConfig);

      if (response.data.success) {
        showNotification('Connection test successful!', 'success');
      } else {
        showNotification('Connection test failed: ' + response.data.message, 'error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      showNotification('Connection test failed. Please check your configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDbConnect = async (e) => {
    e.preventDefault();
    
    if (!dbConfig.type || !dbConfig.host || !dbConfig.database || !dbConfig.username) {
      showNotification('Please fill in all required fields', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/database/connect', dbConfig);

      if (response.data.success) {
        setDbConnection(response.data.data);
        setConnectionStatus('connected');
        setShowDbModal(false);
        showNotification('Database connected successfully!', 'success');
        
        // Reset form
        setDbConfig({
          type: '',
          host: '',
          port: '',
          database: '',
          username: '',
          password: ''
        });
      } else {
        showNotification('Failed to connect: ' + response.data.message, 'error');
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
      showNotification('Failed to connect to database. Please check your configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and redirect
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  };

  const quickExamples = [
    { text: 'Show me all users who registered this month', display: 'Users this month' },
    { text: 'Find products with low inventory', display: 'Low inventory' },
    { text: 'Calculate average order value by region', display: 'Avg order by region' },
    { text: 'List top 10 customers by revenue', display: 'Top customers' }
  ];

  const handleExampleClick = (example) => {
    setNaturalLanguageInput(example);
    // Focus the textarea
    const textarea = document.getElementById('naturalLanguageInput');
    if (textarea) {
      textarea.focus();
    }
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">
          <img src={logoImg} alt="DevQuery Logo" />
          <span>DevQuery</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li className="active">
              <a href="#sql-generator">
                <i className="fas fa-database"></i>
                <span>SQL Generator</span>
              </a>
            </li>
            <li>
              <a href="#query-history">
                <i className="fas fa-history"></i>
                <span>Query History</span>
              </a>
            </li>
            <li>
              <a href="#schema-explorer">
                <i className="fas fa-sitemap"></i>
                <span>Schema Explorer</span>
              </a>
            </li>
            <li>
              <a href="#saved-queries">
                <i className="fas fa-bookmark"></i>
                <span>Saved Queries</span>
              </a>
            </li>
            <li>
              <Link to="/analytics">
                <i className="fas fa-chart-line"></i>
                <span>Analytics</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="user-profile">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">Developer</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h1>SQL Query Generator</h1>
            <p>Convert natural language to SQL queries with AI</p>
          </div>
          <div className="header-right">
            <button className="btn btn-secondary" onClick={handleConnectDatabase}>
              <i className="fas fa-plug"></i>
              Connect Database
            </button>
            <div className={`connection-status ${connectionStatus}`}>
              <i className="fas fa-circle"></i>
              <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        {/* Query Generator Section */}
        <section className="query-generator">
          <div className="input-section">
            <div className="input-container">
              <label htmlFor="naturalLanguageInput">Describe what you want to query:</label>
              <div className="input-wrapper">
                <textarea
                  id="naturalLanguageInput"
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="e.g., Show me all customers who made purchases in the last 30 days"
                  rows="3"
                />
                <button className="btn btn-primary" onClick={handleGenerateSQL} disabled={loading}>
                  <i className="fas fa-magic"></i>
                  {loading ? 'Generating...' : 'Generate SQL'}
                </button>
              </div>
            </div>

            <div className="quick-examples">
              <span className="examples-label">Quick Examples:</span>
              <div className="example-tags">
                {quickExamples.map((example, index) => (
                  <button
                    key={index}
                    className="example-tag"
                    onClick={() => handleExampleClick(example.text)}
                  >
                    {example.display}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="results-section">
            <div className="result-tabs">
              <button
                className={`tab-btn ${activeTab === 'sql' ? 'active' : ''}`}
                onClick={() => setActiveTab('sql')}
              >
                Generated SQL
              </button>
              <button
                className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveTab('results')}
              >
                Query Results
              </button>
              <button
                className={`tab-btn ${activeTab === 'explanation' ? 'active' : ''}`}
                onClick={() => setActiveTab('explanation')}
              >
                Explanation
              </button>
            </div>

            <div className="tab-content">
              {/* SQL Tab */}
              {activeTab === 'sql' && (
                <div className="tab-pane active">
                  <div className="sql-editor">
                    <div className="editor-header">
                      <span className="editor-title">SQL Query</span>
                      <div className="editor-actions">
                        <button className="btn btn-sm" onClick={handleCopySQL} title="Copy to clipboard">
                          <i className="fas fa-copy"></i>
                        </button>
                        <button className="btn btn-sm" title="Save query">
                          <i className="fas fa-save"></i>
                        </button>
                        <button className="btn btn-sm" title="Format SQL">
                          <i className="fas fa-code"></i>
                        </button>
                      </div>
                    </div>
                    <div className="code-editor">
                      <pre><code className="sql-code">{generatedSQL}</code></pre>
                    </div>
                    <div className="editor-footer">
                      <button className="btn btn-success" onClick={handleExecuteQuery} disabled={!dbConnection || loading}>
                        <i className="fas fa-play"></i>
                        {loading ? 'Executing...' : 'Execute Query'}
                      </button>
                      <span className="query-info">
                        <i className="fas fa-info-circle"></i>
                        Estimated rows: <span>{estimatedRows}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Tab */}
              {activeTab === 'results' && (
                <div className="tab-pane active">
                  <div className="results-container">
                    <div className="results-header">
                      <span className="results-title">Query Results</span>
                      <div className="results-actions">
                        <button className="btn btn-sm">
                          <i className="fas fa-download"></i>
                          Export CSV
                        </button>
                        <span className="results-count">Showing <span>{queryResults.length}</span> rows</span>
                      </div>
                    </div>
                    <div className="table-container">
                      {queryResults.length > 0 ? (
                        <table className="results-table">
                          <thead>
                            <tr>
                              {Object.keys(queryResults[0]).map(key => (
                                <th key={key}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResults.map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, i) => (
                                  <td key={i}>{String(value)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="no-results">
                          <i className="fas fa-table"></i>
                          <p>Execute a query to see results</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation Tab */}
              {activeTab === 'explanation' && (
                <div className="tab-pane active">
                  <div className="explanation-container">
                    <div className="explanation-header">
                      <i className="fas fa-lightbulb"></i>
                      <span>Query Explanation</span>
                    </div>
                    <div className="explanation-content">
                      <p>{explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <span>Processing...</span>
          </div>
        </div>
      )}

      {/* Database Connection Modal */}
      {showDbModal && (
        <div className="modal" onClick={(e) => {
          if (e.target.className === 'modal') {
            setShowDbModal(false);
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Connect to Database</h3>
              <button className="close-modal" onClick={() => setShowDbModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleDbConnect}>
                <div className="form-group">
                  <label htmlFor="dbType">Database Type *</label>
                  <select 
                    id="dbType" 
                    value={dbConfig.type}
                    onChange={(e) => handleDbConfigChange('type', e.target.value)}
                    required
                  >
                    <option value="">Select database type</option>
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mssql">SQL Server</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="dbHost">Host *</label>
                  <input 
                    type="text" 
                    id="dbHost" 
                    placeholder="localhost" 
                    value={dbConfig.host}
                    onChange={(e) => handleDbConfigChange('host', e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="dbPort">Port</label>
                  <input 
                    type="number" 
                    id="dbPort" 
                    placeholder="3306"
                    value={dbConfig.port}
                    onChange={(e) => handleDbConfigChange('port', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="dbName">Database Name *</label>
                  <input 
                    type="text" 
                    id="dbName" 
                    placeholder="my_database"
                    value={dbConfig.database}
                    onChange={(e) => handleDbConfigChange('database', e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="dbUser">Username *</label>
                  <input 
                    type="text" 
                    id="dbUser" 
                    placeholder="username"
                    value={dbConfig.username}
                    onChange={(e) => handleDbConfigChange('username', e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="dbPassword">Password</label>
                  <input 
                    type="password" 
                    id="dbPassword"
                    placeholder="password"
                    value={dbConfig.password}
                    onChange={(e) => handleDbConfigChange('password', e.target.value)}
                  />
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleTestConnection} disabled={loading}>
                    <i className="fas fa-check"></i>
                    {loading ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <i className="fas fa-plug"></i>
                    {loading ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification notification-${notification.type}`}>
            <i className={`fas fa-${getNotificationIcon(notification.type)}`}></i>
            <span>{notification.message}</span>
            <button className="close-notification" onClick={() => removeNotification(notification.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
