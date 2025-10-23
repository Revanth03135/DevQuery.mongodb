import { useState, useEffect, useRef } from 'react';
import './QueryHistory.css';

function QueryHistory({ isOpen, onClose, onExecuteQuery, showNotification }) {
  const [queryHistory, setQueryHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [filterTimeRange, setFilterTimeRange] = useState('24h'); // '24h', '12h', '1h'
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const historyBodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadQueryHistory();
      setCurrentPage(1);
    }
  }, [isOpen, filterTimeRange]);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1);
  }, [queryHistory, searchTerm, sortBy, statusFilter]);

  const loadQueryHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
      const filtered = getTimeFilteredQueries(history, filterTimeRange);
      setQueryHistory(filtered);
    } catch (e) {
      console.error('Error loading query history:', e);
      showNotification('Error loading query history', 'error');
    }
  };

  const getTimeFilteredQueries = (history, timeRange) => {
    const now = new Date();
    let cutoffTime;

    switch (timeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '12h':
        cutoffTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return history.filter(query => {
      const queryTime = new Date(query.executedAt);
      return queryTime >= cutoffTime;
    });
  };

  const applyFiltersAndSort = () => {
    let filtered = [...queryHistory];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.sql.toLowerCase().includes(searchLower) ||
        (q.explanation && q.explanation.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.executedAt) - new Date(b.executedAt));
    } else if (sortBy === 'slowest') {
      filtered.sort((a, b) => (b.executionTime || 0) - (a.executionTime || 0));
    } else if (sortBy === 'fastest') {
      filtered.sort((a, b) => (a.executionTime || 0) - (b.executionTime || 0));
    } else if (sortBy === 'mostRows') {
      filtered.sort((a, b) => (b.resultCount || 0) - (a.resultCount || 0));
    }

    setFilteredHistory(filtered);
  };

  const deleteQuery = (index) => {
    try {
      const queryToDelete = queryHistory[index];
      const newHistory = queryHistory.filter((_, i) => i !== index);
      setQueryHistory(newHistory);
      
      // Also remove from total localStorage history
      const allHistory = JSON.parse(localStorage.getItem('queryHistory') || '[]');
      const updatedAllHistory = allHistory.filter(q => 
        q.executedAt !== queryToDelete.executedAt || q.sql !== queryToDelete.sql
      );
      localStorage.setItem('queryHistory', JSON.stringify(updatedAllHistory));
      
      setShowDeleteConfirm(null);
      showNotification('Query removed from history', 'success');
    } catch (e) {
      showNotification('Error deleting query', 'error');
    }
  };

  const clearAllHistory = () => {
    if (window.confirm('This will delete all query history from the last 24 hours. This cannot be undone. Continue?')) {
      try {
        setQueryHistory([]);
        localStorage.setItem('queryHistory', JSON.stringify([]));
        setCurrentPage(1);
        showNotification('Query history cleared', 'success');
      } catch (e) {
        showNotification('Error clearing history', 'error');
      }
    }
  };

  const handleExecuteQuery = (query) => {
    onExecuteQuery(query.sql);
    onClose();
  };

  const handleSaveQuery = (query) => {
    try {
      const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
      
      // Check if query already exists
      const exists = savedQueries.some(saved => saved.sql === query.sql);
      if (exists) {
        showNotification('⚠️ Query already saved', 'warning');
        return;
      }

      // Add new query to saved queries
      const newQuery = {
        sql: query.sql,
        explanation: query.explanation || '',
        createdAt: new Date().toISOString()
      };
      
      savedQueries.unshift(newQuery);
      localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
      showNotification('✅ Query saved successfully!', 'success');
    } catch (e) {
      console.error('Error saving query:', e);
      showNotification('❌ Error saving query', 'error');
    }
  };

  const exportQueryHistory = () => {
    try {
      const dataStr = JSON.stringify(queryHistory, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `query-history-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('History exported successfully', 'success');
    } catch (e) {
      showNotification('Error exporting history', 'error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatFullDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (ms) => {
    if (!ms || ms === 0) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatSQL = (sql, maxLength = 120) => {
    if (!sql) return 'No query';
    return sql.length > maxLength ? sql.substring(0, maxLength) + '...' : sql;
  };

  const syntaxHighlightSQL = (sql) => {
    if (!sql) return '';
    const keywords = /\b(SELECT|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|LIMIT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|HAVING|AS|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL)\b/gi;
    return sql.replace(keywords, '<span class="keyword">$1</span>');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <span className="status-badge success"><i className="fas fa-check-circle"></i> Success</span>;
      case 'error':
        return <span className="status-badge error"><i className="fas fa-exclamation-circle"></i> Error</span>;
      default:
        return <span className="status-badge pending"><i className="fas fa-spinner"></i> Pending</span>;
    }
  };

  const getExecutionSpeedClass = (ms) => {
    if (!ms) return 'unknown';
    if (ms < 100) return 'very-fast';
    if (ms < 500) return 'fast';
    if (ms < 2000) return 'normal';
    if (ms < 5000) return 'slow';
    return 'very-slow';
  };

  if (!isOpen) return null;

  const successCount = queryHistory.filter(q => q.status === 'success').length;
  const errorCount = queryHistory.filter(q => q.status === 'error').length;
  const totalDuration = queryHistory.reduce((sum, q) => sum + (q.executionTime || 0), 0);
  const avgDuration = queryHistory.length > 0 ? totalDuration / queryHistory.length : 0;

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="modal query-history-modal" onClick={(e) => {
      if (e.target.className === 'modal query-history-modal') {
        onClose();
      }
    }}>
      <div className="modal-content query-history-modal-content">
        {/* Header */}
        <div className="modal-header query-history-header">
          <div className="query-history-title">
            <div className="history-icon">
              <i className="fas fa-history"></i>
            </div>
            <div className="title-content">
              <h2>Query History</h2>
              <p>Track and manage your query executions</p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="header-btn export-btn"
              onClick={exportQueryHistory}
              title="Export history as JSON"
              disabled={queryHistory.length === 0}
            >
              <i className="fas fa-download"></i>
              <span>Export</span>
            </button>
            <button className="close-modal" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body query-history-body" ref={historyBodyRef}>
          {/* Time Range Filter */}
          <div className="time-range-filter">
            <label>Time Range:</label>
            <div className="time-buttons">
              <button
                className={`time-btn ${filterTimeRange === '1h' ? 'active' : ''}`}
                onClick={() => setFilterTimeRange('1h')}
              >
                Last 1 Hour
              </button>
              <button
                className={`time-btn ${filterTimeRange === '12h' ? 'active' : ''}`}
                onClick={() => setFilterTimeRange('12h')}
              >
                Last 12 Hours
              </button>
              <button
                className={`time-btn ${filterTimeRange === '24h' ? 'active' : ''}`}
                onClick={() => setFilterTimeRange('24h')}
              >
                Last 24 Hours
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="history-stats-dashboard">
            <div className="stat-card primary">
              <div className="stat-icon">
                <i className="fas fa-list"></i>
              </div>
              <div className="stat-details">
                <div className="stat-label">Total Queries</div>
                <div className="stat-value">{queryHistory.length}</div>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-details">
                <div className="stat-label">Successful</div>
                <div className="stat-value">{successCount}</div>
              </div>
            </div>

            <div className="stat-card error">
              <div className="stat-icon">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="stat-details">
                <div className="stat-label">Errors</div>
                <div className="stat-value">{errorCount}</div>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-details">
                <div className="stat-label">Avg Duration</div>
                <div className="stat-value">{formatDuration(avgDuration)}</div>
              </div>
            </div>

            {queryHistory.length > 0 && (
              <div className="stat-card warning">
                <div className="stat-icon">
                  <i className="fas fa-database"></i>
                </div>
                <div className="stat-details">
                  <div className="stat-label">Total Rows</div>
                  <div className="stat-value">
                    {queryHistory.reduce((sum, q) => sum + (q.resultCount || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Controls */}
          <div className="advanced-controls">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search queries, table names, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>

            <div className="filter-sort-section">
              <div className="filter-group">
                <label>Status:</label>
                <div className="filter-buttons">
                  {['all', 'success', 'error'].map(status => (
                    <button
                      key={status}
                      className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === 'all' && <><i className="fas fa-list"></i> All</>}
                      {status === 'success' && <><i className="fas fa-check"></i> Success</>}
                      {status === 'error' && <><i className="fas fa-times"></i> Errors</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sort-group">
                <label htmlFor="sort-select">
                  <i className="fas fa-sort-amount-down"></i> Sort by:
                </label>
                <select
                  id="sort-select"
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="slowest">Slowest First</option>
                  <option value="fastest">Fastest First</option>
                  <option value="mostRows">Most Rows</option>
                </select>
              </div>

              <div className="page-size-group">
                <label htmlFor="page-size">
                  <i className="fas fa-list-ol"></i> Items per page:
                </label>
                <select
                  id="page-size"
                  className="page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>

              {queryHistory.length > 0 && (
                <button
                  className="btn-clear-all"
                  onClick={clearAllHistory}
                  title="Clear all query history"
                >
                  <i className="fas fa-trash-alt"></i> Clear All
                </button>
              )}
            </div>
          </div>

          {/* History List */}
          <div className="history-list-container">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <p className="empty-title">
                  {queryHistory.length === 0 ? 'No Query History Yet' : 'No Queries Match Your Filters'}
                </p>
                <p className="empty-description">
                  {queryHistory.length === 0
                    ? 'Execute a query to see it in history'
                    : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <>
                <div className="history-list">
                  {paginatedHistory.map((query, idx) => {
                    const originalIndex = queryHistory.indexOf(query);
                    const isExpanded = expandedIndex === originalIndex;

                    return (
                      <div
                        key={`${query.executedAt}-${idx}`}
                        className={`history-item ${query.status} ${isExpanded ? 'expanded' : ''}`}
                      >
                        {/* Query Header - Always Visible */}
                        <div 
                          className="query-header"
                          onClick={() => setExpandedIndex(isExpanded ? null : originalIndex)}
                        >
                          <div className="header-left">
                            <div className={`status-indicator ${query.status}`}>
                              {query.status === 'success' && <i className="fas fa-check"></i>}
                              {query.status === 'error' && <i className="fas fa-exclamation"></i>}
                            </div>

                            <div className="query-summary">
                              <div className="query-text">
                                <code className="query-code">{formatSQL(query.sql, 100)}</code>
                              </div>
                              <div className="query-metadata">
                                <span className="meta-badge time">
                                  <i className="fas fa-clock"></i>
                                  {formatDate(query.executedAt)}
                                </span>
                                <span className={`meta-badge duration ${getExecutionSpeedClass(query.executionTime)}`}>
                                  <i className="fas fa-hourglass-end"></i>
                                  {formatDuration(query.executionTime)}
                                </span>
                                {query.resultCount !== undefined && (
                                  <span className="meta-badge rows">
                                    <i className="fas fa-table"></i>
                                    {query.resultCount.toLocaleString()} rows
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="header-right">
                            <button
                              className="action-icon-btn execute-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExecuteQuery(query);
                              }}
                              title="Re-execute query"
                            >
                              <i className="fas fa-play"></i>
                            </button>

                            <button
                              className="action-icon-btn copy-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(query.sql);
                                showNotification('Query copied to clipboard', 'success');
                              }}
                              title="Copy query"
                            >
                              <i className="fas fa-copy"></i>
                            </button>

                            <button
                              className="action-icon-btn save-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveQuery(query);
                              }}
                              title="Save query"
                            >
                              <i className="fas fa-bookmark"></i>
                            </button>

                            <button
                              className="action-icon-btn delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(originalIndex);
                              }}
                              title="Delete from history"
                            >
                              <i className="fas fa-trash"></i>
                            </button>

                            <div className="expand-indicator">
                              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                            </div>
                          </div>
                        </div>

                        {/* Query Details - Expandable */}
                        {isExpanded && (
                          <div className="query-details">
                            {/* Full Query Code */}
                            <div className="detail-block">
                              <h4 className="detail-title">
                                <i className="fas fa-code"></i> Query
                              </h4>
                              <pre className="query-code-full"><code>{query.sql}</code></pre>
                            </div>

                            {/* Execution Stats */}
                            <div className="detail-block">
                              <h4 className="detail-title">
                                <i className="fas fa-chart-bar"></i> Execution Details
                              </h4>
                              <div className="stats-grid">
                                <div className="stat-item">
                                  <span className="stat-label">Executed:</span>
                                  <span className="stat-value">{formatFullDateTime(query.executedAt)}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Duration:</span>
                                  <span className={`stat-value ${getExecutionSpeedClass(query.executionTime)}`}>
                                    {formatDuration(query.executionTime)}
                                  </span>
                                </div>
                                {query.resultCount !== undefined && (
                                  <div className="stat-item">
                                    <span className="stat-label">Rows:</span>
                                    <span className="stat-value">{query.resultCount.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="stat-item">
                                  <span className="stat-label">Status:</span>
                                  <span className={`stat-value badge ${query.status}`}>
                                    {query.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Error Message if exists */}
                            {query.status === 'error' && query.errorMessage && (
                              <div className="detail-block error-block">
                                <h4 className="detail-title">
                                  <i className="fas fa-exclamation-triangle"></i> Error Message
                                </h4>
                                <div className="error-content">
                                  <p>{query.errorMessage}</p>
                                </div>
                              </div>
                            )}

                            {/* Query Explanation if exists */}
                            {query.explanation && (
                              <div className="detail-block explanation-block">
                                <h4 className="detail-title">
                                  <i className="fas fa-lightbulb"></i> Explanation
                                </h4>
                                <p className="explanation-text">{query.explanation}</p>
                              </div>
                            )}

                            {/* Delete Confirmation */}
                            {showDeleteConfirm === originalIndex && (
                              <div className="delete-confirm-block">
                                <p className="confirm-text">
                                  <i className="fas fa-exclamation-circle"></i>
                                  Are you sure you want to delete this query from history?
                                </p>
                                <div className="confirm-buttons">
                                  <button
                                    className="btn btn-danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteQuery(originalIndex);
                                    }}
                                  >
                                    <i className="fas fa-trash"></i> Delete
                                  </button>
                                  <button
                                    className="btn btn-cancel"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirm(null);
                                    }}
                                  >
                                    <i className="fas fa-times"></i> Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination-footer">
                    <div className="pagination-info">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredHistory.length)} of {filteredHistory.length} queries
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <div className="page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Info */}
        {queryHistory.length > 0 && (
          <div className="query-history-footer">
            <div className="footer-info">
              <span>
                <i className="fas fa-database"></i>
                {queryHistory.length} total queries • {successCount} successful • {errorCount} errors
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryHistory;
