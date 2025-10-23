import { useState, useEffect } from 'react';
import './SavedQueries.css';

function SavedQueries({ isOpen, onClose, onExecuteQuery, showNotification }) {
  const [savedQueries, setSavedQueries] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'favorites'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'oldest'
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    loadSavedQueries();
    loadFavorites();
  }, [isOpen]);

  const loadSavedQueries = () => {
    try {
      const queries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
      setSavedQueries(queries);
    } catch (e) {
      console.error('Error loading saved queries:', e);
      showNotification('Error loading saved queries', 'error');
    }
  };

  const loadFavorites = () => {
    try {
      const favs = JSON.parse(localStorage.getItem('queryFavorites') || '[]');
      setFavorites(favs);
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  };

  const toggleFavorite = (index) => {
    try {
      const newFavorites = [...favorites];
      if (newFavorites.includes(index)) {
        newFavorites.splice(newFavorites.indexOf(index), 1);
      } else {
        newFavorites.push(index);
      }
      setFavorites(newFavorites);
      localStorage.setItem('queryFavorites', JSON.stringify(newFavorites));
      showNotification(
        newFavorites.includes(index) ? '⭐ Added to favorites' : '☆ Removed from favorites',
        'success'
      );
    } catch (e) {
      showNotification('Error updating favorites', 'error');
    }
  };

  const deleteQuery = (index) => {
    try {
      const newQueries = savedQueries.filter((_, i) => i !== index);
      setSavedQueries(newQueries);
      localStorage.setItem('savedQueries', JSON.stringify(newQueries));
      
      // Remove from favorites if it was favorited
      const newFavorites = favorites.filter(fav => fav !== index).map(fav => fav > index ? fav - 1 : fav);
      setFavorites(newFavorites);
      localStorage.setItem('queryFavorites', JSON.stringify(newFavorites));
      
      setShowDeleteConfirm(null);
      showNotification('Query deleted', 'success');
    } catch (e) {
      showNotification('Error deleting query', 'error');
    }
  };

  const handleExecuteQuery = (query) => {
    onExecuteQuery(query.sql);
    onClose();
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

  const formatSQL = (sql) => {
    return sql.length > 100 ? sql.substring(0, 100) + '...' : sql;
  };

  // Filter and sort queries
  let filteredQueries = savedQueries;

  if (filterMode === 'favorites') {
    filteredQueries = filteredQueries.filter((_, index) => favorites.includes(index));
  }

  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filteredQueries = filteredQueries.filter(q => 
      q.sql.toLowerCase().includes(searchLower) || 
      (q.explanation && q.explanation.toLowerCase().includes(searchLower))
    );
  }

  if (sortBy === 'recent') {
    // Already sorted (most recent first from storage)
  } else if (sortBy === 'oldest') {
    filteredQueries = [...filteredQueries].reverse();
  } else if (sortBy === 'name') {
    filteredQueries = [...filteredQueries].sort((a, b) => 
      a.sql.localeCompare(b.sql)
    );
  }

  if (!isOpen) return null;

  return (
    <div className="modal saved-queries-modal" onClick={(e) => {
      if (e.target.className === 'modal saved-queries-modal') {
        onClose();
      }
    }}>
      <div className="modal-content saved-queries-modal-content">
        {/* Header */}
        <div className="modal-header saved-queries-header">
          <div className="saved-queries-title">
            <i className="fas fa-bookmark"></i>
            <div>
              <h2>Saved Queries</h2>
              <p>Manage and execute your saved SQL queries</p>
            </div>
          </div>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body saved-queries-body">
          {/* Controls */}
          <div className="saved-queries-controls">
            <div className="control-group">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="control-group">
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  <i className="fas fa-list"></i> All ({savedQueries.length})
                </button>
                <button
                  className={`filter-btn ${filterMode === 'favorites' ? 'active' : ''}`}
                  onClick={() => setFilterMode('favorites')}
                >
                  <i className="fas fa-star"></i> Favorites ({favorites.length})
                </button>
              </div>

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Queries List */}
          <div className="queries-list">
            {filteredQueries.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>
                  {filterMode === 'favorites' && favorites.length === 0
                    ? 'No favorite queries yet'
                    : savedQueries.length === 0
                    ? 'No saved queries yet'
                    : 'No queries match your search'}
                </p>
              </div>
            ) : (
              filteredQueries.map((query, displayIndex) => {
                // Find the original index for favorite checking
                const originalIndex = savedQueries.indexOf(query);
                const isFavorited = favorites.includes(originalIndex);

                return (
                  <div
                    key={originalIndex}
                    className={`query-item ${selectedQuery === originalIndex ? 'selected' : ''}`}
                    onClick={() => setSelectedQuery(selectedQuery === originalIndex ? null : originalIndex)}
                  >
                    {/* Query Header */}
                    <div className="query-item-header">
                      <div className="query-info">
                        <div className="query-preview">
                          <code>{formatSQL(query.sql)}</code>
                        </div>
                        <div className="query-meta">
                          <span className="query-time">
                            <i className="fas fa-clock"></i>
                            {formatDate(query.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="query-actions">
                        <button
                          className={`action-btn favorite-btn ${isFavorited ? 'favorited' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(originalIndex);
                          }}
                          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <i className={`fas fa-star ${isFavorited ? 'filled' : ''}`}></i>
                        </button>

                        <button
                          className="action-btn execute-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteQuery(query);
                          }}
                          title="Execute query"
                        >
                          <i className="fas fa-play"></i>
                        </button>

                        <button
                          className="action-btn copy-btn"
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
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(originalIndex);
                          }}
                          title="Delete query"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    {/* Query Details (Expanded) */}
                    {selectedQuery === originalIndex && (
                      <div className="query-item-details">
                        <div className="query-full-sql">
                          <h4>Full Query:</h4>
                          <pre><code>{query.sql}</code></pre>
                        </div>
                        {query.explanation && (
                          <div className="query-explanation">
                            <h4>Explanation:</h4>
                            <p>{query.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete Confirmation */}
                    {showDeleteConfirm === originalIndex && (
                      <div className="delete-confirm">
                        <p>Delete this query?</p>
                        <div className="confirm-actions">
                          <button
                            className="btn btn-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuery(originalIndex);
                            }}
                          >
                            Delete
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Info */}
        {savedQueries.length > 0 && (
          <div className="saved-queries-footer">
            <div className="footer-info">
              <i className="fas fa-info-circle"></i>
              <span>Showing {filteredQueries.length} of {savedQueries.length} queries</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedQueries;
