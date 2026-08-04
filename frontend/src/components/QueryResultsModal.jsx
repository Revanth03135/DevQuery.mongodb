import React from 'react';
import { formatResultValue } from '../utils/schemaUtils';

/**
 * QueryResultsModal
 *
 * Extracted from Dashboard.jsx (Issue 6 refactor).
 * Displays query results in a popup modal overlay.
 */
function QueryResultsModal({
  isOpen,
  onClose,
  queryResults,
  queryResultColumns,
  queryMetadata,
  onCopyResults,
  onExportResults
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal results-modal"
      onClick={(e) => {
        if (e.target.className === 'modal results-modal') onClose();
      }}
    >
      <div className="modal-content results-modal-content">
        <div className="modal-header">
          <h3>Query Results</h3>
          <button className="close-modal" onClick={onClose} aria-label="Close results">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body results-modal-body">
          <div className="results-header">
            <div>
              <div className="results-title">Results</div>
              <div className="results-meta">
                <span className="results-count">
                  {queryMetadata?.rowCount ?? queryResults.length} rows
                </span>
                {typeof queryMetadata?.executionTime === 'number' && (
                  <span className="results-chip">
                    Execution {queryMetadata.executionTime} ms
                  </span>
                )}
                {queryMetadata?.provider && (
                  <span className="results-chip">
                    {queryMetadata.provider === 'assistant' ? 'Assistant' : queryMetadata.provider}
                  </span>
                )}
                {queryMetadata?.model && (
                  <span className="results-chip neutral">{queryMetadata.model}</span>
                )}
                {queryMetadata?.confidence && (
                  <span className="results-chip neutral">
                    Confidence: {queryMetadata.confidence}
                  </span>
                )}
              </div>
            </div>
            <div className="results-actions">
              <button
                className="btn btn-sm"
                onClick={onCopyResults}
                disabled={!queryResults.length}
                title="Copy JSON"
              >
                <i className="fas fa-copy"></i> Copy
              </button>
              <button
                className="btn btn-sm"
                onClick={onExportResults}
                disabled={!queryResults.length}
                title="Export CSV"
              >
                <i className="fas fa-file-csv"></i> Export
              </button>
            </div>
          </div>

          {queryMetadata?.cautions?.length ? (
            <div className="results-alert">
              {queryMetadata.cautions.map((warning, idx) => (
                <span key={idx}>⚠️ {warning}</span>
              ))}
            </div>
          ) : null}

          <div className="table-container">
            {queryResultColumns.length ? (
              <table className="results-table">
                <thead>
                  <tr>
                    {queryResultColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.length ? (
                    queryResults.map((row, index) => (
                      <tr key={index}>
                        {queryResultColumns.map((column) => (
                          <td key={column}>{formatResultValue(row?.[column])}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan={queryResultColumns.length}>No rows returned for this query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="no-results">
                <i className="fas fa-table"></i>
                <p>No results to display.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QueryResultsModal;
