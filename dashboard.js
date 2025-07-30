// Dashboard JavaScript for DevQuery

class DevQueryDashboard {
  constructor() {
    this.currentTab = 'sql';
    this.isConnected = false;
    this.queryHistory = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupTabSwitching();
    this.loadExampleQueries();
    this.initializeCodeEditor();
  }

  bindEvents() {
    // Generate SQL button
    document.getElementById('generateBtn').addEventListener('click', () => {
      this.generateSQL();
    });

    // Execute query button
    document.getElementById('executeBtn').addEventListener('click', () => {
      this.executeQuery();
    });

    // Database connection
    document.getElementById('connectDbBtn').addEventListener('click', () => {
      this.showDbModal();
    });

    // Modal events
    document.getElementById('closeModal').addEventListener('click', () => {
      this.hideDbModal();
    });

    document.getElementById('dbConnectionForm').addEventListener('submit', (e) => {
      this.handleDbConnection(e);
    });

    // Test connection
    document.getElementById('testConnection').addEventListener('click', () => {
      this.testDbConnection();
    });

    // Example tags
    document.querySelectorAll('.example-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        this.useExample(e.target.dataset.example);
      });
    });

    // Copy SQL button
    document.getElementById('copyBtn').addEventListener('click', () => {
      this.copySQL();
    });

    // Save query button
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveQuery();
    });

    // Format SQL button
    document.getElementById('formatBtn').addEventListener('click', () => {
      this.formatSQL();
    });

    // Export results button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportResults();
    });

    // Schema sidebar
    this.bindSchemaSidebarEvents();

    // Navigation
    this.bindNavigationEvents();

    // Keyboard shortcuts
    this.bindKeyboardShortcuts();

    // Close modal on outside click
    document.getElementById('dbModal').addEventListener('click', (e) => {
      if (e.target.id === 'dbModal') {
        this.hideDbModal();
      }
    });
  }

  setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;
  }

  loadExampleQueries() {
    const examples = [
      "Show all users who registered this month",
      "Find products with low inventory",
      "Calculate average order value by region",
      "List top 10 customers by revenue",
      "Get orders placed in the last 7 days",
      "Find customers with no recent activity"
    ];

    // These are already in the HTML, but we could dynamically load more
  }

  initializeCodeEditor() {
    const sqlCode = document.getElementById('sqlCode');
    
    // Make the code editor editable
    sqlCode.contentEditable = true;
    sqlCode.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      }
    });

    // Add syntax highlighting placeholder
    this.highlightSQL();
  }

  async generateSQL() {
    const input = document.getElementById('naturalLanguageInput').value.trim();
    
    if (!input) {
      this.showNotification('Please enter a description of what you want to query', 'warning');
      return;
    }

    this.showLoading('Generating SQL query...');

    try {
      // Simulate API call to generate SQL
      const sql = await this.callSQLGenerationAPI(input);
      
      // Update the SQL editor
      document.getElementById('sqlCode').textContent = sql;
      this.highlightSQL();
      
      // Update explanation
      this.updateExplanation(input, sql);
      
      // Switch to SQL tab
      this.switchTab('sql');
      
      // Update estimated rows (placeholder)
      document.getElementById('estimatedRows').textContent = '~' + Math.floor(Math.random() * 1000);
      
      this.hideLoading();
      this.showNotification('SQL query generated successfully!', 'success');
      
    } catch (error) {
      this.hideLoading();
      this.showNotification('Error generating SQL: ' + error.message, 'error');
    }
  }

  async callSQLGenerationAPI(naturalLanguage) {
    // Simulate API call - replace with actual API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simple SQL generation based on keywords
        let sql = '';
        
        if (naturalLanguage.toLowerCase().includes('users') && naturalLanguage.toLowerCase().includes('month')) {
          sql = `SELECT u.id, u.name, u.email, u.created_at
FROM users u
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
ORDER BY u.created_at DESC;`;
        } else if (naturalLanguage.toLowerCase().includes('inventory') || naturalLanguage.toLowerCase().includes('stock')) {
          sql = `SELECT p.id, p.name, p.stock_quantity, p.reorder_level
FROM products p
WHERE p.stock_quantity <= p.reorder_level
ORDER BY p.stock_quantity ASC;`;
        } else if (naturalLanguage.toLowerCase().includes('average') && naturalLanguage.toLowerCase().includes('order')) {
          sql = `SELECT r.region_name, 
       AVG(o.total_amount) as avg_order_value,
       COUNT(o.id) as total_orders
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN regions r ON c.region_id = r.id
GROUP BY r.region_name
ORDER BY avg_order_value DESC;`;
        } else if (naturalLanguage.toLowerCase().includes('top') && naturalLanguage.toLowerCase().includes('customers')) {
          sql = `SELECT c.id, c.name, c.email,
       SUM(o.total_amount) as total_revenue,
       COUNT(o.id) as total_orders
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.email
ORDER BY total_revenue DESC
LIMIT 10;`;
        } else {
          sql = `-- Generated SQL query
SELECT *
FROM table_name
WHERE condition = 'value'
ORDER BY created_at DESC
LIMIT 100;`;
        }
        
        resolve(sql);
      }, 1500);
    });
  }

  async executeQuery() {
    if (!this.isConnected) {
      this.showNotification('Please connect to a database first', 'warning');
      return;
    }

    const sql = document.getElementById('sqlCode').textContent.trim();
    
    if (!sql || sql === '-- Your generated SQL will appear here') {
      this.showNotification('Please generate or enter a SQL query first', 'warning');
      return;
    }

    this.showLoading('Executing query...');

    try {
      // Simulate query execution
      const results = await this.executeQueryAPI(sql);
      this.displayResults(results);
      this.switchTab('results');
      
      // Add to history
      this.addToHistory(sql, results);
      
      this.hideLoading();
      this.showNotification('Query executed successfully!', 'success');
      
    } catch (error) {
      this.hideLoading();
      this.showNotification('Error executing query: ' + error.message, 'error');
    }
  }

  async executeQueryAPI(sql) {
    // Simulate API call - replace with actual database connection
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate mock results
        const columns = ['id', 'name', 'email', 'created_at', 'status'];
        const rows = [];
        
        for (let i = 1; i <= 25; i++) {
          rows.push([
            i,
            `User ${i}`,
            `user${i}@example.com`,
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            Math.random() > 0.5 ? 'Active' : 'Inactive'
          ]);
        }
        
        resolve({ columns, rows });
      }, 1000);
    });
  }

  displayResults(results) {
    const container = document.getElementById('resultsTable');
    
    if (!results.rows || results.rows.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-table"></i>
          <p>No results found</p>
        </div>
      `;
      return;
    }

    // Create table
    let html = '<table class="data-table"><thead><tr>';
    
    results.columns.forEach(col => {
      html += `<th>${col}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    results.rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    container.innerHTML = html;
    
    // Update row count
    document.getElementById('rowCount').textContent = results.rows.length;
  }

  updateExplanation(naturalLanguage, sql) {
    const explanationContent = document.getElementById('explanationContent');
    
    const explanation = `
      <div class="explanation-item">
        <h4><i class="fas fa-lightbulb"></i> Query Purpose</h4>
        <p>This query was generated to: <em>"${naturalLanguage}"</em></p>
      </div>
      
      <div class="explanation-item">
        <h4><i class="fas fa-cogs"></i> What it does</h4>
        <p>The SQL query performs the following operations:</p>
        <ul>
          <li>Selects data from relevant tables</li>
          <li>Applies necessary filters and conditions</li>
          <li>Orders results for optimal presentation</li>
          <li>Includes appropriate joins if multiple tables are involved</li>
        </ul>
      </div>
      
      <div class="explanation-item">
        <h4><i class="fas fa-chart-line"></i> Performance Notes</h4>
        <p>This query is optimized for readability and performance. Consider adding indexes on frequently queried columns for better performance with large datasets.</p>
      </div>
    `;
    
    explanationContent.innerHTML = explanation;
  }

  useExample(example) {
    document.getElementById('naturalLanguageInput').value = example;
    document.getElementById('naturalLanguageInput').focus();
  }

  showDbModal() {
    document.getElementById('dbModal').classList.add('active');
  }

  hideDbModal() {
    document.getElementById('dbModal').classList.remove('active');
  }

  async handleDbConnection(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const connectionData = {
      type: document.getElementById('dbType').value,
      host: document.getElementById('dbHost').value,
      port: document.getElementById('dbPort').value,
      database: document.getElementById('dbName').value,
      username: document.getElementById('dbUser').value,
      password: document.getElementById('dbPassword').value
    };

    this.showLoading('Connecting to database...');

    try {
      // Simulate connection
      await this.connectToDatabase(connectionData);
      this.isConnected = true;
      this.updateConnectionStatus(true);
      this.hideDbModal();
      this.hideLoading();
      this.showNotification('Successfully connected to database!', 'success');
      
      // Load schema
      this.loadDatabaseSchema();
      
    } catch (error) {
      this.hideLoading();
      this.showNotification('Failed to connect: ' + error.message, 'error');
    }
  }

  async connectToDatabase(connectionData) {
    // Simulate database connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (connectionData.host && connectionData.database && connectionData.username) {
          resolve();
        } else {
          reject(new Error('Invalid connection parameters'));
        }
      }, 2000);
    });
  }

  async testDbConnection() {
    const connectionData = {
      type: document.getElementById('dbType').value,
      host: document.getElementById('dbHost').value,
      port: document.getElementById('dbPort').value,
      database: document.getElementById('dbName').value,
      username: document.getElementById('dbUser').value,
      password: document.getElementById('dbPassword').value
    };

    const btn = document.getElementById('testConnection');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    btn.disabled = true;

    try {
      await this.connectToDatabase(connectionData);
      this.showNotification('Connection test successful!', 'success');
    } catch (error) {
      this.showNotification('Connection test failed: ' + error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    
    if (connected) {
      status.className = 'connection-status connected';
      status.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
    } else {
      status.className = 'connection-status disconnected';
      status.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
    }
  }

  async loadDatabaseSchema() {
    // Simulate loading database schema
    const schema = {
      tables: [
        {
          name: 'users',
          columns: ['id', 'name', 'email', 'created_at', 'updated_at']
        },
        {
          name: 'orders',
          columns: ['id', 'customer_id', 'total_amount', 'status', 'created_at']
        },
        {
          name: 'products',
          columns: ['id', 'name', 'price', 'stock_quantity', 'category_id']
        },
        {
          name: 'customers',
          columns: ['id', 'name', 'email', 'phone', 'address', 'region_id']
        }
      ]
    };

    this.displaySchema(schema);
  }

  displaySchema(schema) {
    const schemaTree = document.getElementById('schemaTree');
    
    let html = '';
    schema.tables.forEach(table => {
      html += `
        <div class="schema-table">
          <div class="table-header">
            <i class="fas fa-table"></i>
            <span>${table.name}</span>
          </div>
          <div class="table-columns">
            ${table.columns.map(col => `
              <div class="column-item">
                <i class="fas fa-columns"></i>
                <span>${col}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
    
    schemaTree.innerHTML = html;
  }

  copySQL() {
    const sql = document.getElementById('sqlCode').textContent;
    navigator.clipboard.writeText(sql).then(() => {
      this.showNotification('SQL copied to clipboard!', 'success');
    });
  }

  saveQuery() {
    const sql = document.getElementById('sqlCode').textContent;
    const name = prompt('Enter a name for this query:');
    
    if (name) {
      // Save to localStorage or send to backend
      this.showNotification(`Query "${name}" saved successfully!`, 'success');
    }
  }

  formatSQL() {
    // Simple SQL formatting
    let sql = document.getElementById('sqlCode').textContent;
    
    // Basic formatting rules
    sql = sql.replace(/SELECT/gi, '\nSELECT');
    sql = sql.replace(/FROM/gi, '\nFROM');
    sql = sql.replace(/WHERE/gi, '\nWHERE');
    sql = sql.replace(/ORDER BY/gi, '\nORDER BY');
    sql = sql.replace(/GROUP BY/gi, '\nGROUP BY');
    sql = sql.replace(/HAVING/gi, '\nHAVING');
    sql = sql.replace(/JOIN/gi, '\nJOIN');
    sql = sql.replace(/INNER JOIN/gi, '\nINNER JOIN');
    sql = sql.replace(/LEFT JOIN/gi, '\nLEFT JOIN');
    sql = sql.replace(/RIGHT JOIN/gi, '\nRIGHT JOIN');
    
    // Clean up extra newlines
    sql = sql.replace(/\n+/g, '\n').trim();
    
    document.getElementById('sqlCode').textContent = sql;
    this.showNotification('SQL formatted!', 'success');
  }

  exportResults() {
    // Simple CSV export simulation
    this.showNotification('Results exported to CSV!', 'success');
  }

  addToHistory(sql, results) {
    this.queryHistory.unshift({
      sql,
      results,
      timestamp: new Date(),
      rowCount: results.rows.length
    });
    
    // Keep only last 50 queries
    if (this.queryHistory.length > 50) {
      this.queryHistory = this.queryHistory.slice(0, 50);
    }
  }

  bindSchemaSidebarEvents() {
    // Schema sidebar toggle (if needed)
    // Implementation for schema explorer sidebar
  }

  bindNavigationEvents() {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items
        document.querySelectorAll('.sidebar-nav li').forEach(li => {
          li.classList.remove('active');
        });
        
        // Add active class to clicked item
        e.target.closest('li').classList.add('active');
        
        // Handle navigation
        const href = e.target.getAttribute('href');
        this.handleNavigation(href);
      });
    });

    // Logout button
    document.querySelector('.logout-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'index.html';
      }
    });
  }

  handleNavigation(section) {
    // Handle different sections
    switch(section) {
      case '#sql-generator':
        // Already on this page
        break;
      case '#query-history':
        this.showQueryHistory();
        break;
      case '#schema-explorer':
        this.toggleSchemaSidebar();
        break;
      case '#saved-queries':
        this.showSavedQueries();
        break;
      case '#analytics':
        this.showAnalytics();
        break;
    }
  }

  showQueryHistory() {
    // Implementation for query history view
    this.showNotification('Query history feature coming soon!', 'info');
  }

  toggleSchemaSidebar() {
    const sidebar = document.getElementById('schemaSidebar');
    sidebar.classList.toggle('open');
  }

  showSavedQueries() {
    this.showNotification('Saved queries feature coming soon!', 'info');
  }

  showAnalytics() {
    this.showNotification('Analytics feature coming soon!', 'info');
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter to execute query
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.executeQuery();
      }
      
      // Ctrl+Shift+F to format SQL
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.formatSQL();
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        this.hideDbModal();
        this.hideLoading();
      }
    });
  }

  highlightSQL() {
    // Simple syntax highlighting placeholder
    // In a real implementation, you'd use a library like Prism.js or CodeMirror
    const code = document.getElementById('sqlCode');
    // Add highlighting classes, etc.
  }

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const spinner = overlay.querySelector('.loading-spinner span');
    spinner.textContent = message;
    overlay.classList.add('active');
  }

  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
      <button class="close-notification">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
    
    // Manual close
    notification.querySelector('.close-notification').addEventListener('click', () => {
      notification.remove();
    });
    
    // Add styles if not exists
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 4000;
          max-width: 400px;
          animation: slideIn 0.3s ease-out;
        }
        
        .notification-success { border-left: 4px solid #28a745; }
        .notification-error { border-left: 4px solid #dc3545; }
        .notification-warning { border-left: 4px solid #ffc107; }
        .notification-info { border-left: 4px solid #17a2b8; }
        
        .close-notification {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          margin-left: auto;
          opacity: 0.6;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  getNotificationIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new DevQueryDashboard();
});