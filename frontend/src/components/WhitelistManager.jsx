import { useState, useEffect } from 'react';
import api from '../utils/api';
import './WhitelistManager.css';

function WhitelistManager({ isOpen, onClose, connectionId, dbSchema, user }) {
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Whitelist state
  const [whitelistData, setWhitelistData] = useState({
    enabled: false,
    tables: {}
  });
  
  const [selectedTables, setSelectedTables] = useState({});
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [expandedTable, setExpandedTable] = useState(null);

  // Fetch whitelist data when modal opens
  useEffect(() => {
    if (isOpen && connectionId) {
      fetchWhitelist();
      extractAvailableTables();
    }
  }, [isOpen, connectionId]);

  const extractAvailableTables = () => {
    if (dbSchema && Array.isArray(dbSchema)) {
      const tables = dbSchema.map(table => ({
        name: table.table_name || table.name,
        columns: (table.columns || []).map(col => col.name || col.column_name)
      }));
      setAvailableTables(tables);
    }
  };

  const fetchWhitelist = async () => {
    try {
      const response = await api.get(`/api/whitelist/${connectionId}`);
      if (response.data.success) {
        setWhitelistData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    }
  };

  const verifyPassword = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Re-authenticate user with their login credentials
      const response = await api.post('/api/auth/re-authenticate', {
        email: user?.email,
        password
      });
      
      if (response.data.success) {
        setIsPasswordVerified(true);
        setSuccess('Password verified! You can now edit whitelist settings.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid password. Please check your login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWhitelist = async () => {
    if (!isPasswordVerified) {
      setError('Please verify password first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post(`/api/whitelist/${connectionId}/enable`, {
        userId: user?.id,
        enabled: !whitelistData.enabled
      });
      
      if (response.data.success) {
        setWhitelistData(response.data.data);
        setSuccess(response.data.message);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update whitelist');
    } finally {
      setLoading(false);
    }
  };

  const addTable = async () => {
    if (!newTableName.trim()) {
      setError('Table name is required');
      return;
    }

    if (!isPasswordVerified) {
      setError('Please verify password first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Get columns for the selected table from schema
      const tableSchema = availableTables.find(t => t.name === newTableName);
      const columnsList = tableSchema?.columns || [];

      const response = await api.post(`/api/whitelist/${connectionId}/table`, {
        userId: user?.id,
        tableName: newTableName,
        allowedColumns: columnsList // Allow all columns by default
      });
      
      if (response.data.success) {
        setWhitelistData(response.data.data);
        setNewTableName('');
        setShowAddTable(false);
        setSuccess(`Table "${newTableName}" added to whitelist`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add table');
    } finally {
      setLoading(false);
    }
  };

  const removeTable = async (tableName) => {
    if (!isPasswordVerified) {
      setError('Please verify password first');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove "${tableName}" from whitelist?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.delete(`/api/whitelist/${connectionId}/table/${tableName}`, {
        data: { userId: user?.id }
      });
      
      if (response.data.success) {
        setWhitelistData(response.data.data);
        setSuccess(`Table "${tableName}" removed from whitelist`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove table');
    } finally {
      setLoading(false);
    }
  };

  const updateColumnAccess = async (tableName, columnName, action) => {
    if (!isPasswordVerified) {
      setError('Please verify password first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let response;
      
      if (action === 'add') {
        response = await api.post(`/api/whitelist/${connectionId}/table/${tableName}/columns`, {
          userId: user?.id,
          allowedColumns: [columnName]
        });
      } else if (action === 'remove') {
        response = await api.post(`/api/whitelist/${connectionId}/table/${tableName}/columns/remove`, {
          userId: user?.id,
          columnNames: [columnName]
        });
      }
      
      if (response?.data.success) {
        setWhitelistData(response.data.data);
        setSuccess(`Column "${columnName}" ${action === 'add' ? 'allowed' : 'denied'}`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || `Failed to ${action} column`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setPassword('');
    setIsPasswordVerified(false);
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal whitelist-modal" onClick={(e) => {
      if (e.target.className === 'modal whitelist-modal') {
        onClose();
      }
    }}>
      <div className="modal-content whitelist-modal-content">
        <div className="modal-header">
          <div className="whitelist-header-title">
            <i className="fas fa-lock"></i>
            <h2>🔐 Manage AI Whitelist</h2>
            <p>Control which tables and columns AI can read and modify</p>
          </div>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body whitelist-modal-body">
          {/* Password Verification Section */}
          {!isPasswordVerified ? (
            <div className="password-verification">
              <div className="verification-card">
                <h3>Verify Your Identity</h3>
                <p>Enter your login password to manage whitelist settings</p>
                
                <form onSubmit={verifyPassword} className="verification-form">
                  <div className="form-group">
                    <label htmlFor="loginPassword">Login Password *</label>
                    <div className="password-input-wrapper">
                      <input
                        id="loginPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your DevQuery login password"
                        disabled={loading}
                      />
                      <span className="password-hint">
                        <i className="fas fa-info-circle"></i>
                        The same password you use to login to DevQuery
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="alert alert-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {error}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={loading || !password.trim()}>
                    <i className="fas fa-unlock"></i>
                    {loading ? 'Verifying...' : 'Verify Password'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              {/* Verified Section */}
              <div className="verified-header">
                <div className="verified-status">
                  <i className="fas fa-check-circle"></i>
                  <span>Password Verified</span>
                </div>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>

              {error && (
                <div className="alert alert-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <i className="fas fa-check"></i>
                  {success}
                </div>
              )}

              {/* Whitelist Enable/Disable Toggle */}
              <div className="whitelist-toggle-section">
                <div className="toggle-header">
                  <h3>Whitelist Status</h3>
                  <p>Enable to restrict AI access to specific tables and columns only</p>
                </div>
                
                <div className="toggle-card">
                  <div className="toggle-info">
                    <span className={`status-badge ${whitelistData.enabled ? 'enabled' : 'disabled'}`}>
                      <i className={`fas ${whitelistData.enabled ? 'fa-shield-alt' : 'fa-lock-open'}`}></i>
                      {whitelistData.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <div className="toggle-description">
                      <p>
                        {whitelistData.enabled 
                          ? 'Whitelist is ENABLED - AI can only access whitelisted tables'
                          : 'Whitelist is DISABLED - AI has access to all tables (if database permissions allow)'
                        }
                      </p>
                    </div>
                  </div>
                  <button 
                    className={`btn ${whitelistData.enabled ? 'btn-danger' : 'btn-success'}`}
                    onClick={toggleWhitelist}
                    disabled={loading}
                  >
                    <i className={`fas ${whitelistData.enabled ? 'fa-times' : 'fa-check'}`}></i>
                    {loading ? 'Updating...' : (whitelistData.enabled ? 'Disable Whitelist' : 'Enable Whitelist')}
                  </button>
                </div>
              </div>

              {/* Tables Management */}
              <div className="tables-management-section">
                <div className="section-header">
                  <h3>Whitelisted Tables</h3>
                  <p>Add tables that AI is allowed to access and modify</p>
                </div>

                {Object.keys(whitelistData.tables).length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>No tables whitelisted yet</p>
                    <small>Add tables below to get started</small>
                  </div>
                ) : (
                  <div className="tables-list">
                    {Object.entries(whitelistData.tables).map(([tableName, tableConfig]) => (
                      <div key={tableName} className="table-item">
                        <button 
                          className="table-header"
                          onClick={() => setExpandedTable(expandedTable === tableName ? null : tableName)}
                        >
                          <span className="table-name">
                            <i className="fas fa-database"></i>
                            {tableName}
                          </span>
                          <div className="table-meta">
                            <span className="column-count">
                              {Object.keys(tableConfig.columns || {}).length} columns
                            </span>
                            <i className={`fas fa-chevron-${expandedTable === tableName ? 'up' : 'down'}`}></i>
                          </div>
                        </button>

                        {expandedTable === tableName && (
                          <div className="table-details">
                            <div className="columns-section">
                              <h4>Allowed Columns</h4>
                              {Object.keys(tableConfig.columns || {}).length === 0 ? (
                                <p className="no-columns">All columns allowed</p>
                              ) : (
                                <div className="columns-list">
                                  {Object.keys(tableConfig.columns).map((columnName) => (
                                    <div key={columnName} className="column-item">
                                      <span className="column-name">
                                        <i className="fas fa-check-square"></i>
                                        {columnName}
                                      </span>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => updateColumnAccess(tableName, columnName, 'remove')}
                                        disabled={loading}
                                        title="Remove column from whitelist"
                                      >
                                        <i className="fas fa-minus"></i>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="table-actions">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeTable(tableName)}
                                disabled={loading}
                              >
                                <i className="fas fa-trash"></i>
                                Remove Table
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Table Section */}
                {showAddTable ? (
                  <div className="add-table-form">
                    <h4>Add New Table to Whitelist</h4>
                    <div className="form-group">
                      <label htmlFor="tableSelect">Select Table *</label>
                      <select
                        id="tableSelect"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                      >
                        <option value="">Choose a table...</option>
                        {availableTables
                          .filter(t => !Object.keys(whitelistData.tables).includes(t.name))
                          .map(table => (
                            <option key={table.name} value={table.name}>
                              {table.name} ({table.columns.length} columns)
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={addTable}
                        disabled={loading || !newTableName}
                      >
                        <i className="fas fa-plus"></i>
                        Add Table
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setShowAddTable(false);
                          setNewTableName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddTable(true)}
                  >
                    <i className="fas fa-plus"></i>
                    Add Table to Whitelist
                  </button>
                )}
              </div>

              {/* Info Section */}
              <div className="whitelist-info">
                <h4>How Whitelist Works</h4>
                <ul>
                  <li><strong>Disabled (Default):</strong> AI has access to all tables. All writes require user confirmation.</li>
                  <li><strong>Enabled:</strong> AI can only access tables you explicitly add to the whitelist.</li>
                  <li><strong>Columns:</strong> Leave empty to allow all columns, or select specific columns to restrict access.</li>
                  <li><strong>User Confirmation:</strong> All write operations always require user approval, regardless of whitelist status.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WhitelistManager;
