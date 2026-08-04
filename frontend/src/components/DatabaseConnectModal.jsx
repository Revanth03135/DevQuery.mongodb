import React from 'react';

/**
 * DatabaseConnectModal
 *
 * Extracted from Dashboard.jsx (Issue 6 refactor).
 * Handles the "Connect to Database" dialog form.
 */
function DatabaseConnectModal({ isOpen, onClose, dbConfig, onConfigChange, onConnect, onTestConnection, loading }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target.className === 'modal-overlay') onClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>Connect to Database</h3>
          <button className="close-modal" onClick={onClose} aria-label="Close modal">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={onConnect}>
            <div className="form-group">
              <label htmlFor="dbConnectionString">Connection String (recommended for MongoDB)</label>
              <input
                type="text"
                id="dbConnectionString"
                placeholder="e.g. mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                value={dbConfig.connectionString}
                onChange={(e) => onConfigChange('connectionString', e.target.value)}
              />
              <small style={{ color: '#888' }}>
                If provided, all other fields are optional. Supports MongoDB, PostgreSQL, MySQL, etc.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="dbType">Database Type *</label>
              <select
                id="dbType"
                value={dbConfig.type}
                onChange={(e) => onConfigChange('type', e.target.value)}
                required={!dbConfig.connectionString}
                disabled={!!dbConfig.connectionString}
              >
                <option value="">Select database type</option>
                <option value="mongodb">🍃 MongoDB</option>
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="sqlite">SQLite</option>
                <option value="mssql">SQL Server</option>
                <option value="oracle">Oracle</option>
              </select>
              {dbConfig.type === 'mongodb' && (
                <small style={{ color: '#00ed64', fontWeight: '500', display: 'block', marginTop: '8px' }}>
                  ✓ MongoDB selected — Schema Explorer will show Collections &amp; Fields
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="dbHost">Host *</label>
              <input
                type="text"
                id="dbHost"
                placeholder="localhost"
                value={dbConfig.host}
                onChange={(e) => onConfigChange('host', e.target.value)}
                required={!dbConfig.connectionString}
                disabled={!!dbConfig.connectionString}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dbPort">Port</label>
              <input
                type="number"
                id="dbPort"
                placeholder="3306"
                value={dbConfig.port}
                onChange={(e) => onConfigChange('port', e.target.value)}
                disabled={!!dbConfig.connectionString}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dbName">Database Name *</label>
              <input
                type="text"
                id="dbName"
                placeholder="my_database"
                value={dbConfig.database}
                onChange={(e) => onConfigChange('database', e.target.value)}
                required={!dbConfig.connectionString}
                disabled={!!dbConfig.connectionString}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dbUser">Username *</label>
              <input
                type="text"
                id="dbUser"
                placeholder="username"
                value={dbConfig.username}
                onChange={(e) => onConfigChange('username', e.target.value)}
                required={!dbConfig.connectionString}
                disabled={!!dbConfig.connectionString}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dbPassword">Password</label>
              <input
                type="password"
                id="dbPassword"
                placeholder="password"
                value={dbConfig.password}
                onChange={(e) => onConfigChange('password', e.target.value)}
                disabled={!!dbConfig.connectionString}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onTestConnection}
                disabled={loading}
              >
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
  );
}

export default DatabaseConnectModal;
