import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import './Dashboard.css';
import logoImg from '../assets/img1.png';
import useNotifications from './useNotifications';
import useSQLDrawer from './useSQLDrawer';
import WhitelistManager from './WhitelistManager';
import SavedQueries from './SavedQueries';
import QueryHistory from './QueryHistory';

const normalizeSearchValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
  try {
    return JSON.stringify(value).toLowerCase();
  } catch (error) {
    return '';
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ERD Renderer Component
const ERDRenderer = ({ tables, onTableClick }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const handleTableClick = (table) => {
    setSelectedTable(table);
    onTableClick(table);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e) => {
    if (e.button === 0 && e.target === canvasRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Calculate table positions in a grid layout
  const tablePositions = useMemo(() => {
    const positions = [];
    const columns = Math.ceil(Math.sqrt(tables.length));
    const spacing = { x: 280, y: 300 };
    const offset = { x: 50, y: 50 };

    tables.forEach((table, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      positions.push({
        table,
        x: offset.x + col * spacing.x,
        y: offset.y + row * spacing.y
      });
    });

    return positions;
  }, [tables]);

  // Find relationships between tables
  const relationships = useMemo(() => {
    const rels = [];
    tablePositions.forEach(({ table, x, y }) => {
      const tableName = table.name;
      (table.columns || []).forEach(column => {
        // Simple FK detection: column name ends with _id and matches another table name
        if (column.name.endsWith('_id')) {
          const potentialTable = column.name.replace(/_id$/, '');
          const targetPos = tablePositions.find(tp => 
            tp.table.name.toLowerCase() === potentialTable.toLowerCase() ||
            tp.table.name.toLowerCase() === potentialTable.toLowerCase() + 's'
          );
          if (targetPos && targetPos.table.name !== tableName) {
            rels.push({
              from: { table: tableName, x, y },
              to: { table: targetPos.table.name, x: targetPos.x, y: targetPos.y },
              column: column.name
            });
          }
        }
      });
    });
    return rels;
  }, [tablePositions]);

  return (
    <div className="erd-container">
      <div className="erd-controls">
        <button onClick={handleZoomOut} className="btn btn-sm" title="Zoom Out">
          <i className="fas fa-search-minus"></i>
        </button>
        <span className="erd-zoom-level">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="btn btn-sm" title="Zoom In">
          <i className="fas fa-search-plus"></i>
        </button>
        <button onClick={handleResetView} className="btn btn-sm" title="Reset View">
          <i className="fas fa-redo"></i>
        </button>
        <span className="erd-info">{tables.length} tables • {relationships.length} relationships</span>
      </div>
      
      <div 
        ref={canvasRef}
        className="erd-canvas"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
      >
        <svg width="100%" height="100%" className="erd-svg">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Render relationships */}
            {relationships.map((rel, idx) => {
              const fromX = rel.from.x + 120;
              const fromY = rel.from.y + 30;
              const toX = rel.to.x + 120;
              const toY = rel.to.y + 30;
              
              return (
                <g key={`rel-${idx}`}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#6366f1"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    opacity="0.6"
                  />
                  <title>{`${rel.from.table}.${rel.column} → ${rel.to.table}`}</title>
                </g>
              );
            })}
            
            {/* Arrow marker definition */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
              </marker>
            </defs>
          </g>
        </svg>

        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {tablePositions.map(({ table, x, y }, idx) => {
            const pkColumns = (table.columns || []).filter(c => c.primaryKey || c.key === 'PRI');
            const fkColumns = (table.columns || []).filter(c => c.name.endsWith('_id'));
            const isSelected = selectedTable?.name === table.name;

            return (
              <div
                key={`table-${idx}`}
                className={`erd-table ${isSelected ? 'selected' : ''}`}
                style={{ left: `${x}px`, top: `${y}px` }}
                onClick={(e) => { e.stopPropagation(); handleTableClick(table); }}
              >
                <div className="erd-table-header">
                  <i className="fas fa-table"></i>
                  <span className="erd-table-name">{table.name}</span>
                  <span className="erd-table-count">{table.columns?.length || 0}</span>
                </div>
                <div className="erd-table-body">
                  {pkColumns.map((col, cidx) => (
                    <div key={`pk-${cidx}`} className="erd-column primary">
                      <i className="fas fa-key"></i>
                      <span>{col.name}</span>
                      <span className="erd-column-type">{col.type}</span>
                    </div>
                  ))}
                  {fkColumns.map((col, cidx) => (
                    <div key={`fk-${cidx}`} className="erd-column foreign">
                      <i className="fas fa-link"></i>
                      <span>{col.name}</span>
                      <span className="erd-column-type">{col.type}</span>
                    </div>
                  ))}
                  {(table.columns || []).filter(c => !c.primaryKey && c.key !== 'PRI' && !c.name.endsWith('_id')).slice(0, 5).map((col, cidx) => (
                    <div key={`col-${cidx}`} className="erd-column">
                      <i className="fas fa-circle" style={{ fontSize: '4px' }}></i>
                      <span>{col.name}</span>
                      <span className="erd-column-type">{col.type}</span>
                    </div>
                  ))}
                  {(table.columns?.length || 0) > (pkColumns.length + fkColumns.length + 5) && (
                    <div className="erd-column-more">
                      +{(table.columns?.length || 0) - (pkColumns.length + fkColumns.length + 5)} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Docs Renderer Component
const DocsRenderer = ({ tables, dbConnection }) => {
  const [format, setFormat] = useState('markdown');
  const [selectedTable, setSelectedTable] = useState(null);

  const generateMarkdown = () => {
    let md = `# Database Documentation\n\n`;
    md += `**Database**: ${dbConnection?.database || 'N/A'}\n`;
    md += `**Type**: ${dbConnection?.dbType?.toUpperCase() || 'N/A'}\n`;
    md += `**Generated**: ${new Date().toLocaleString()}\n`;
    md += `**Total Tables**: ${tables.length}\n\n`;
    md += `---\n\n`;

    tables.forEach(table => {
      md += `## Table: \`${table.name}\`\n\n`;
      md += `**Columns**: ${table.columns?.length || 0}\n\n`;

      if (table.columns && table.columns.length > 0) {
        md += `| Column | Type | Nullable | Default | Key |\n`;
        md += `|--------|------|----------|---------|-----|\n`;
        table.columns.forEach(col => {
          const nullable = col.nullable ? 'YES' : 'NO';
          const defaultVal = col.defaultValue || '-';
          const key = col.primaryKey || col.key === 'PRI' ? '🔑 PK' : col.name.endsWith('_id') ? '🔗 FK' : '-';
          md += `| ${col.name} | ${col.type} | ${nullable} | ${defaultVal} | ${key} |\n`;
        });
        md += `\n`;
      }

      const pkCols = (table.columns || []).filter(c => c.primaryKey || c.key === 'PRI');
      const fkCols = (table.columns || []).filter(c => c.name.endsWith('_id'));

      if (pkCols.length > 0 || fkCols.length > 0) {
        md += `**Relationships**:\n`;
        if (pkCols.length > 0) {
          md += `- Primary Key: ${pkCols.map(c => c.name).join(', ')}\n`;
        }
        if (fkCols.length > 0) {
          md += `- Foreign Keys: ${fkCols.map(c => c.name).join(', ')}\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    });

    return md;
  };

  const generateHTML = () => {
    const md = generateMarkdown();
    // Simple markdown to HTML conversion
    let html = md
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(Boolean).map(c => c.trim());
        return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      });
    
    html = `<div class="docs-html"><p>${html}</p></div>`;
    return html;
  };

  const generateJSON = () => {
    return JSON.stringify({
      database: dbConnection?.database || 'N/A',
      type: dbConnection?.dbType || 'N/A',
      generatedAt: new Date().toISOString(),
      tables: tables.map(table => ({
        name: table.name,
        columnCount: table.columns?.length || 0,
        columns: (table.columns || []).map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          defaultValue: col.defaultValue,
          isPrimaryKey: col.primaryKey || col.key === 'PRI',
          isForeignKey: col.name.endsWith('_id')
        }))
      }))
    }, null, 2);
  };

  const handleExport = () => {
    let content, filename, mimeType;

    if (format === 'markdown') {
      content = generateMarkdown();
      filename = `database-docs-${Date.now()}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'html') {
      content = generateHTML();
      filename = `database-docs-${Date.now()}.html`;
      mimeType = 'text/html';
    } else {
      content = generateJSON();
      filename = `database-docs-${Date.now()}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const content = format === 'markdown' ? generateMarkdown() : format === 'html' ? generateHTML() : generateJSON();
    navigator.clipboard.writeText(content);
  };

  const renderContent = () => {
    if (format === 'markdown') {
      return <pre className="docs-content markdown">{generateMarkdown()}</pre>;
    } else if (format === 'html') {
      return <div className="docs-content html" dangerouslySetInnerHTML={{ __html: generateHTML() }} />;
    } else {
      return <pre className="docs-content json">{generateJSON()}</pre>;
    }
  };

  return (
    <div className="docs-container">
      <div className="docs-toolbar">
        <div className="docs-format-toggle">
          <button 
            className={`btn btn-sm ${format === 'markdown' ? 'active' : ''}`}
            onClick={() => setFormat('markdown')}
          >
            <i className="fab fa-markdown"></i> Markdown
          </button>
          <button 
            className={`btn btn-sm ${format === 'html' ? 'active' : ''}`}
            onClick={() => setFormat('html')}
          >
            <i className="fab fa-html5"></i> HTML
          </button>
          <button 
            className={`btn btn-sm ${format === 'json' ? 'active' : ''}`}
            onClick={() => setFormat('json')}
          >
            <i className="fas fa-code"></i> JSON
          </button>
        </div>
        <div className="docs-actions">
          <button className="btn btn-sm" onClick={handleCopy} title="Copy to clipboard">
            <i className="fas fa-copy"></i> Copy
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleExport} title="Export documentation">
            <i className="fas fa-download"></i> Export
          </button>
        </div>
      </div>
      <div className="docs-preview">
        {renderContent()}
      </div>
    </div>
  );
};

function Dashboard({ user }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [showSavedQueriesModal, setShowSavedQueriesModal] = useState(false);
  const [showQueryHistoryModal, setShowQueryHistoryModal] = useState(false);
  const [showWriteConfirmation, setShowWriteConfirmation] = useState(false);
  const [pendingWriteOperation, setPendingWriteOperation] = useState(null);
  const {
    showSQLDrawer,
    dragEnabled,
    isDragging,
    isResizing,
    isFullscreen,
    drawerPos,
    drawerSize,
    dispatch: drawerDispatch,
    dragRef
  } = useSQLDrawer();
  // Chat assistant state with localStorage persistence
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('devquery.chatHistory');
      if (saved) {
        const { messages, timestamp } = JSON.parse(saved);
        // Keep chat history for 24 hours
        const age = Date.now() - new Date(timestamp).getTime();
        if (age < 24 * 60 * 60 * 1000 && Array.isArray(messages) && messages.length > 0) {
          return messages;
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    // Default welcome message
    return [
      {
        sender: 'bot',
        type: 'text',
        text: 'Hi! I am your database assistant. Ask me anything about your data.',
        timestamp: new Date().toISOString()
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const chatMessagesContainerRef = useRef(null);

  const applyQueryResults = (rows = [], columns = [], metadata = null) => {
    const normalizedRows = Array.isArray(rows) ? rows : [];
    let normalizedColumns = Array.isArray(columns) ? columns : [];

    if (!normalizedColumns.length && normalizedRows.length) {
      const collected = new Set();
      normalizedRows.forEach((row) => {
        Object.keys(row || {}).forEach((key) => collected.add(key));
      });
      normalizedColumns = Array.from(collected);
    }

    setQueryResults(normalizedRows);
    setQueryResultColumns(normalizedColumns);

    if (metadata) {
      const meta = { ...metadata };
      meta.rowCount = meta.rowCount ?? normalizedRows.length;
      if (meta.cautions && !Array.isArray(meta.cautions)) {
        meta.cautions = [meta.cautions];
      }
      if (!meta.cautions) {
        meta.cautions = [];
      }
      setQueryMetadata(meta);
    } else {
      setQueryMetadata(null);
    }

    setActiveTab('results');
  };

    const handleSendChat = async (e) => {
      e.preventDefault();
      if (!chatInput.trim() || assistantLoading) return;

      const userMessage = chatInput.trim();
      const timestamp = new Date().toISOString();

      // Check for display mode keywords
      const showKeywords = ['show', 'display', 'popup', 'window', 'open'];
      const inlineKeywords = ['here', 'in chat', 'inline'];
      
      const messageLower = userMessage.toLowerCase();
      const shouldPopup = showKeywords.some(keyword => messageLower.includes(keyword)) && 
                         !inlineKeywords.some(keyword => messageLower.includes(keyword));
      const shouldInline = inlineKeywords.some(keyword => messageLower.includes(keyword));

      setChatMessages((msgs) => [
        ...msgs,
        { sender: 'user', type: 'text', text: userMessage, timestamp }
      ]);
      setChatInput('');
      setAssistantLoading(true);

      try {
        // Get query history and saved queries from localStorage
        const queryHistory = JSON.parse(localStorage.getItem('queryHistory') || '[]');
        const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
        
        const payload = {
          message: userMessage,
          connectionId: dbConnection?.connectionId || undefined,
          options: { runQuery: true },
          // Include chat history for context (last 20 messages, excluding welcome message and results)
          chatHistory: chatMessages
            .filter(msg => {
              // Exclude welcome message
              if (msg.text?.includes('Hi! I am your database assistant')) return false;
              // Exclude result tables (too much data)
              if (msg.type === 'results') return false;
              // Include everything else
              return true;
            })
            .slice(-20)
            .map(msg => ({
              role: msg.sender === 'bot' ? 'assistant' : msg.sender === 'user' ? 'user' : 'system',
              content: msg.text || msg.content || ''
            })),
          // Include query history (last 10 queries for context)
          queryHistory: queryHistory.slice(0, 10).map(q => ({
            sql: q.sql,
            explanation: q.explanation,
            executedAt: q.executedAt,
            status: q.status,
            resultCount: q.resultCount,
            executionTime: q.executionTime
          })),
          // Include saved queries (last 10 for context)
          savedQueries: savedQueries.slice(0, 10).map(q => ({
            sql: q.sql,
            explanation: q.explanation,
            createdAt: q.createdAt,
            name: q.name || 'Unnamed Query'
          }))
        };

        const response = await api.post('/api/assistant/chat', payload);

        const assistantMessages = Array.isArray(response.data?.data?.messages)
          ? response.data.data.messages
              .map((msg) => {
                if (!msg?.content) return null;
                const role = msg.role === 'assistant' ? 'bot' : msg.role === 'user' ? 'user' : 'system';
                return {
                  sender: role,
                  type: msg.type || 'text',
                  text: msg.content,
                  timestamp: msg.timestamp || new Date().toISOString()
                };
              })
              .filter(Boolean)
          : [];

        if (assistantMessages.length) {
          setChatMessages((msgs) => [...msgs, ...assistantMessages]);
        }

        const result = response.data?.data?.result;
        const meta = response.data?.data?.meta;
        
        // Check if write operation requires confirmation
        if (meta?.requiresConfirmation || result?.intent === 'require_confirmation') {
          setPendingWriteOperation({
            sql: result?.sql || '',
            message: result?.explanation || 'Please review and confirm this database write operation.',
            affectedTable: meta?.affectedTable || null,
            affectedColumns: meta?.affectedColumns || [],
            connectionId: dbConnection?.connectionId
          });
          setShowWriteConfirmation(true);
          return;
        }
        
        if (result) {
          if (result.sql) {
            setGeneratedSQL(result.sql);
          }
          if (result.explanation) {
            setExplanation(result.explanation);
          }

          const cautions = Array.isArray(result.cautions) ? result.cautions : [];

          // Detect intent from user message and response
          const messageLower = userMessage.toLowerCase();
          const hasExplainKeywords = ['explain', 'how does', 'what does', 'why', 'understanding'];
          const hasResultKeywords = ['show', 'result', 'display', 'fetch', 'get', 'retrieve', 'find', 'list', 'count', 'sum', 'average', 'select'];
          
          const wantsExplanation = hasExplainKeywords.some(kw => messageLower.includes(kw));
          const wantsResults = hasResultKeywords.some(kw => messageLower.includes(kw));

          if (Array.isArray(result.rows) || Array.isArray(result.columns)) {
            applyQueryResults(result.rows || [], result.columns || [], {
              rowCount: result.rowCount,
              executionTime: result.executionTime,
              provider: result.provider || 'assistant',
              model: result.model || null,
              confidence: result.confidence || null,
              intent: result.intent,
              cautions
            });

            // Save automatic query execution to history
            if (result.sql) {
              saveQueryToHistory(
                result.sql, 
                result.executionTime || 0, 
                result.rowCount || (result.rows || []).length, 
                'success'
              );
            }

            // Smart tab: If user asked for explanation + result, prioritize results popup
            // but also show explanation below results
            if (wantsExplanation && wantsResults) {
              // User asked for both explanation and results
              setModalMode('popup');
              setShowResultsModal(true);
              // Show explanation in a notification
              if (result.explanation) {
                showNotification(`📊 Results shown above. Explanation: ${result.explanation.substring(0, 100)}...`, 'info');
              }
            } else if (shouldPopup) {
              setModalMode('popup');
              setShowResultsModal(true);
              showNotification('Results displayed in popup window.', 'success');
            } else if (shouldInline) {
              // Add results table to chat
              setChatMessages((msgs) => [
                ...msgs,
                {
                  sender: 'bot',
                  type: 'results',
                  text: JSON.stringify({ rows: result.rows || [], columns: result.columns || [] }),
                  timestamp: new Date().toISOString()
                }
              ]);
              showNotification('Results displayed in chat.', 'success');
            } else {
              // Default: show popup
              setModalMode('popup');
              setShowResultsModal(true);
              showNotification('Results displayed automatically.', 'success');
            }
          } else if (result.sql) {
            // Smart tab: Determine which tab to show based on user intent
            if (wantsExplanation && result.explanation) {
              setActiveTab('explanation');
              showNotification('📖 Explanation displayed.', 'info');
            } else if (wantsResults) {
              // If results are wanted but no data, show SQL tab
              setActiveTab('sql');
            } else {
              // Default: show SQL tab
              setActiveTab('sql');
            }
            
            setQueryMetadata((prev) => ({
              ...(prev || {}),
              rowCount: prev?.rowCount ?? 0,
              provider: result.provider || 'assistant',
              model: result.model || null,
              confidence: result.confidence || null,
              cautions
            }));
            showNotification('Assistant generated SQL. Review before executing.', 'info');
          }
        }
      } catch (error) {
        const errorCode = error.response?.data?.code;
        const errorMessage = error.response?.data?.message || 'The assistant could not respond.';
        const fallbackText =
          errorCode === 'AI_CONFIG_MISSING'
            ? 'AI assistant is not configured yet. Set GEMINI_API_KEY on the backend to enable automated SQL.'
            : `⚠️ ${errorMessage}`;

        setChatMessages((msgs) => [
          ...msgs,
          {
            sender: 'bot',
            type: 'note',
            text: fallbackText,
            timestamp: new Date().toISOString()
          }
        ]);

        if (errorCode === 'AI_CONFIG_MISSING') {
          showNotification('Configure GEMINI_API_KEY to unlock AI automation.', 'warning');
        } else {
          showNotification('Assistant response failed.', 'error');
        }
      } finally {
        setAssistantLoading(false);
      }
    };

  const handleConfirmWrite = async () => {
    if (!pendingWriteOperation) return;

    setAssistantLoading(true);
    try {
      const response = await api.post('/api/assistant/confirm-write', {
        connectionId: pendingWriteOperation.connectionId,
        sql: pendingWriteOperation.sql,
        affectedTable: pendingWriteOperation.affectedTable,
        affectedColumns: pendingWriteOperation.affectedColumns,
        confirmed: true
      });

      const data = response.data;
      
      if (data.success && data.executed !== false) {
        const result = data.data?.result || data.result;
        const rowsAffected = result?.rowsAffected || result?.affectedRows || 0;
        const executionTime = result?.executionTime || 0;
        const insertId = result?.insertId || null;
        const table = pendingWriteOperation.affectedTable || 'table';
        const columns = pendingWriteOperation.affectedColumns || [];
        
        // Update Query Generator with the executed SQL
        setGeneratedSQL(pendingWriteOperation.sql);
        setExplanation(`Write operation executed on table '${table}'`);
        
        // Show results in popup with write operation details
        const writeResultRows = [{
          'Status': '✅ Success',
          'Rows Affected': rowsAffected,
          'Table': table,
          'Execution Time': `${executionTime}ms`,
          ...(insertId ? { 'Insert ID': insertId } : {})
        }];
        
        const writeResultColumns = ['Status', 'Rows Affected', 'Table', 'Execution Time'];
        if (insertId) writeResultColumns.push('Insert ID');
        
        applyQueryResults(writeResultRows, writeResultColumns, {
          rowCount: 1,
          executionTime,
          provider: 'manual',
          model: null,
          confidence: null,
          intent: 'write_executed',
          cautions: []
        });
        
        // Show results modal
        setModalMode('popup');
        setShowResultsModal(true);
        
        // Save write operation to history
        saveQueryToHistory(
          pendingWriteOperation.sql, 
          executionTime, 
          rowsAffected, 
          'success'
        );
        
        // Create detailed success message
        let successMessage = `✅ Operation completed successfully!\n`;
        successMessage += `• Rows affected: ${rowsAffected}\n`;
        successMessage += `• Table: ${table}\n`;
        if (columns.length > 0) {
          successMessage += `• Columns: ${columns.join(', ')}\n`;
        }
        if (insertId) {
          successMessage += `• Insert ID: ${insertId}\n`;
        }
        successMessage += `• Execution time: ${executionTime}ms`;
        
        setChatMessages(prev => [...prev, {
          sender: 'bot',
          type: 'text',
          text: successMessage,
          timestamp: new Date().toISOString()
        }]);
        
        showNotification(`✅ ${rowsAffected} row(s) affected successfully!`, 'success');
      } else if (data.executed === false) {
        // Operation was not executed (likely cancelled or validation failed)
        setChatMessages(prev => [...prev, {
          sender: 'bot',
          type: 'note',
          text: `ℹ️ ${data.message || 'Write operation was not executed'}`,
          timestamp: new Date().toISOString()
        }]);
      }
      
      setShowWriteConfirmation(false);
      setPendingWriteOperation(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Write operation failed';
      
      // Save failed write operation to history
      saveQueryToHistory(
        pendingWriteOperation.sql, 
        0, 
        0, 
        'error', 
        errorMessage
      );
      
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        type: 'note',
        text: `❌ Error: ${errorMessage}`,
        timestamp: new Date().toISOString()
      }]);
      
      showNotification(`Write operation failed: ${errorMessage}`, 'error');
      setShowWriteConfirmation(false);
      setPendingWriteOperation(null);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleCancelWrite = () => {
    setShowWriteConfirmation(false);
    setPendingWriteOperation(null);
    
    setChatMessages(prev => [...prev, {
      sender: 'bot',
      type: 'text',
      text: '❌ Write operation cancelled by user.',
      timestamp: new Date().toISOString()
    }]);
    
    showNotification('Write operation cancelled', 'info');
  };

  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('-- Your generated SQL will appear here\nSELECT * FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);');
  const [queryResults, setQueryResults] = useState([]);
  const [queryResultColumns, setQueryResultColumns] = useState([]);
  const [queryMetadata, setQueryMetadata] = useState(null);
  const [explanation, setExplanation] = useState('Generate a SQL query to see the explanation here.');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sql');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [modalMode, setModalMode] = useState('popup'); // 'popup' or 'inline'
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [dbConnection, setDbConnection] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    connectionString: '',
    type: '',
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  });
  const [estimatedRows, setEstimatedRows] = useState('--');
  const { notifications, showNotification, removeNotification, getNotificationIcon } = useNotifications();
  const [schemaData, setSchemaData] = useState({ tables: [], loading: false, error: null });
  const [schemaSearch, setSchemaSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [schemaViewMode, setSchemaViewMode] = useState('tables');
  const [isSchemaCollapsed, setIsSchemaCollapsed] = useState(false);
  const navigate = useNavigate();
  
  // Track if chat restore notification was shown to prevent duplicates
  const chatRestoreNotifiedRef = useRef(false);

  const searchTokens = useMemo(() => {
    const tokens = (schemaSearch || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return Array.from(new Set(tokens));
  }, [schemaSearch]);

  const searchTokenSet = useMemo(() => new Set(searchTokens), [searchTokens]);

  const highlightPattern = useMemo(() => {
    if (!searchTokens.length) return null;
    const escaped = searchTokens.map((token) => escapeRegExp(token));
    return new RegExp(`(${escaped.join('|')})`, 'gi');
  }, [searchTokens]);

  const filteredTables = useMemo(() => {
    const tables = schemaData.tables || [];
    if (!searchTokens.length) {
      return tables;
    }

    return tables.filter((table) => {
      const tableName = normalizeSearchValue(table?.name);
      const columns = Array.isArray(table?.columns) ? table.columns : [];

      return searchTokens.every((token) => {
        if (tableName.includes(token)) return true;

        return columns.some((col) => {
          const columnName = normalizeSearchValue(col?.name);
          const columnType = normalizeSearchValue(col?.type);
          const columnDefault = normalizeSearchValue(col?.defaultValue);
          const columnSample = normalizeSearchValue(col?.sample);

          return (
            columnName.includes(token) ||
            columnType.includes(token) ||
            columnDefault.includes(token) ||
            columnSample.includes(token)
          );
        });
      });
    });
  }, [schemaData.tables, searchTokens]);

  const visibleColumns = useMemo(() => {
    if (!selectedTable) return [];
    const columns = Array.isArray(selectedTable.columns) ? selectedTable.columns : [];
    if (!searchTokens.length) return columns;

    const tableName = normalizeSearchValue(selectedTable.name);
    return columns.filter((column) => {
      const columnName = normalizeSearchValue(column?.name);
      const columnType = normalizeSearchValue(column?.type);
      const columnDefault = normalizeSearchValue(column?.defaultValue);
      const columnSample = normalizeSearchValue(column?.sample);

      return searchTokens.every((token) =>
        tableName.includes(token) ||
        columnName.includes(token) ||
        columnType.includes(token) ||
        columnDefault.includes(token) ||
        columnSample.includes(token)
      );
    });
  }, [selectedTable, searchTokens]);

  const totalColumns = Array.isArray(selectedTable?.columns) ? selectedTable.columns.length : 0;
  const hasSearch = searchTokens.length > 0;

  const countMatchingColumns = (table) => {
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    if (!searchTokens.length) return columns.length;

    const tableName = normalizeSearchValue(table?.name);
    const tableMatchesAll = searchTokens.every((token) => tableName.includes(token));
    if (tableMatchesAll) return columns.length;

    return columns.filter((column) => {
      const columnName = normalizeSearchValue(column?.name);
      const columnType = normalizeSearchValue(column?.type);
      const columnDefault = normalizeSearchValue(column?.defaultValue);
      const columnSample = normalizeSearchValue(column?.sample);

      return searchTokens.every((token) =>
        tableName.includes(token) ||
        columnName.includes(token) ||
        columnType.includes(token) ||
        columnDefault.includes(token) ||
        columnSample.includes(token)
      );
    }).length;
  };

  const renderHighlight = (value, emptyPlaceholder = '—') => {
    if (value === null || value === undefined || value === '') {
      return emptyPlaceholder;
    }

    const str = value.toString();
    if (!highlightPattern) return str;

    const parts = str.split(highlightPattern);
    return parts.map((part, index) => {
      if (!part) return null;
      const lower = part.toLowerCase();
      if (searchTokenSet.has(lower)) {
        return <mark key={`highlight-${index}`}>{part}</mark>;
      }
      return <Fragment key={`text-${index}`}>{part}</Fragment>;
    });
  };

  const isMongoDB = dbConnection?.dbType === 'mongodb';
  const itemName = isMongoDB ? 'field' : 'column';
  const columnCountLabel = hasSearch
    ? `Showing ${visibleColumns.length} of ${totalColumns} ${itemName}s`
    : `${totalColumns} ${itemName}${totalColumns === 1 ? '' : 's'}`;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const cachedSchema = localStorage.getItem('devquery.schema');
    if (cachedSchema) {
      try {
        const parsed = JSON.parse(cachedSchema);
        setSchemaData(prev => ({ ...prev, tables: parsed.tables || [] }));
      } catch (e) {
        console.warn('Failed to parse cached schema', e);
      }
    }

    // Check for existing connections
    checkExistingConnections();

    // Notify user if chat history was restored (only once)
    if (!chatRestoreNotifiedRef.current) {
      try {
        const saved = localStorage.getItem('devquery.chatHistory');
        if (saved) {
          const { messages, timestamp } = JSON.parse(saved);
          const age = Date.now() - new Date(timestamp).getTime();
          if (age < 24 * 60 * 60 * 1000 && Array.isArray(messages) && messages.length > 1) {
            const hours = Math.floor(age / (1000 * 60 * 60));
            const timeAgo = hours > 0 ? `${hours}h ago` : 'recently';
            showNotification(`💬 Restored ${messages.length} messages from ${timeAgo}`, 'info');
            chatRestoreNotifiedRef.current = true; // Mark as notified
          }
        }
      } catch (error) {
        console.error('Failed to check chat history:', error);
      }
    }
  }, [user, navigate]);

  // Auto-save chat messages to localStorage
  useEffect(() => {
    try {
      if (chatMessages.length > 0) {
        // Save last 50 messages with timestamp
        const toSave = {
          messages: chatMessages.slice(-50),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('devquery.chatHistory', JSON.stringify(toSave));
      }
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!filteredTables.length) {
      if (selectedTable) {
        setSelectedTable(null);
      }
      return;
    }

    const stillVisible = filteredTables.some((table) => table.name === selectedTable?.name);
    if (!stillVisible) {
      setSelectedTable(filteredTables[0]);
    }
  }, [filteredTables, selectedTable]);

  // Close dropdown menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (!menu.parentElement.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const normalizeConnection = (connection) => {
    if (!connection) return null;
    const type = connection.dbType || connection.type || 'db';
    return {
      connectionId: connection.connectionId,
      type,
      dbType: type,
      database: connection.database,
      host: connection.host,
      connectionName: connection.connectionName || `${type.toUpperCase()}_${connection.database || connection.host || 'connection'}`
    };
  };

  const fetchSchema = async (connectionId) => {
    if (!connectionId) return;
    setSchemaData(prev => ({ ...prev, loading: true, error: null }));
    try {
      console.log('🔍 Fetching schema for connection:', connectionId);
      const response = await api.get(`/api/database/connections/${connectionId}/schema`);
      console.log('📦 Schema response:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch schema');
      }

      console.log('📊 Raw schema data:', response.data.data);
      const tables = transformSchemaResponse(response.data.data);
      console.log('✅ Transformed tables:', tables);
      console.log('📈 Number of collections/tables:', tables.length);
      
      setSchemaData(prev => ({ ...prev, tables, loading: false }));
      localStorage.setItem('devquery.schema', JSON.stringify({ tables }));
    } catch (error) {
      console.error('❌ Schema fetch error:', error);
      console.error('Error details:', error.response?.data);
      setSchemaData(prev => ({ ...prev, loading: false, error: error.message || 'Failed to fetch schema' }));
      showNotification('Schema explorer unavailable. Check console for details.', 'warning');
    }
  };

  const transformSchemaResponse = (data) => {
    if (!data) {
      console.warn('⚠️ Schema data is null or undefined');
      return [];
    }

    if (!Array.isArray(data)) {
      console.warn('⚠️ Schema data is not an array:', typeof data);
      return [];
    }

    if (data.length === 0) {
      console.info('ℹ️ Schema data is empty array - database has no collections/tables');
      return [];
    }

    console.log('🔄 Transforming schema data:', data.length, 'items');

    // Format 1: Flat structure with table_name (old SQL format)
    if (data[0].table_name && !data[0].columns) {
      const grouped = data.reduce((acc, item) => {
        const tableName = item.table_name;
        if (!acc[tableName]) {
          acc[tableName] = [];
        }
        acc[tableName].push({
          name: item.column_name,
          type: item.data_type,
          nullable: item.is_nullable === 'YES' || item.nullable === 'Y',
          defaultValue: item.column_default
        });
        return acc;
      }, {});

      return Object.entries(grouped).map(([table, columns]) => ({
        name: table,
        columns
      }));
    }

    // Format 2: Grouped structure with columns array (MongoDB/modern SQL)
    if (data[0].columns) {
      return data.map((table) => ({
        name: table.table_name || table.name,
        columns: (table.columns || []).map((column) => ({
          name: column.name || column.column_name,
          type: column.type || column.data_type,
          nullable: column.nullable ?? column.is_nullable === 'YES',
          defaultValue: column.defaultValue || column.column_default,
          sample: column.sample
        }))
      }));
    }

    // Format 3: Collections format (alternative MongoDB format)
    if (data.collections) {
      return Object.entries(data.collections).map(([name, info]) => ({
        name,
        columns: (info.fields || []).map((field) => ({
          name: field.name,
          type: field.type,
          nullable: field.optional,
          defaultValue: field.defaultValue || null,
          sample: field.sample
        }))
      }));
    }

    console.warn('⚠️ Unknown schema format, returning empty array');
    return [];
  };

  const checkExistingConnections = async () => {
    try {
      const response = await api.get('/api/database/connections');

      if (!response.data?.success) {
        return;
      }

      const payload = response.data.data;
      const connections = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.connections)
          ? payload.connections
          : [];

      if (connections.length === 0) {
        setConnectionStatus('disconnected');
        setDbConnection(null);
        return;
      }

      const activeConnection = connections.find((conn) => conn.connected || conn.status === 'connected') || connections[0];
      if (activeConnection) {
        const normalizedConnection = normalizeConnection(activeConnection);
        setDbConnection(normalizedConnection);
        setConnectionStatus('connected');
        await fetchSchema(normalizedConnection.connectionId);
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
        description: naturalLanguageInput
      });

      if (response.data.success) {
        const payload = response.data.data || {};
        setGeneratedSQL(payload.sql || '--');
        setExplanation(payload.explanation || 'SQL query generated successfully.');
        setEstimatedRows(payload.estimatedRows || '—');
        setActiveTab('sql');

        if (Array.isArray(payload.cautions) && payload.cautions.length) {
          showNotification(payload.cautions[0], 'warning');
        }

        if (payload.provider === 'mock' || payload.isFallback) {
          showNotification('SQL generated using fallback template. Configure Gemini for AI-powered results.', 'warning');
        } else {
          showNotification('SQL query generated successfully!', 'success');
        }
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
      applyQueryResults(demoResults.rows, demoResults.columns, {
        rowCount: demoResults.rows.length,
        provider: 'demo',
        intent: 'demo'
      });
      saveQueryToHistory(generatedSQL, 0, demoResults.rows.length, 'success');
      showNotification('Demo results displayed! Connect a database for real data.', 'info');
      return;
    }

    setLoading(true);
    const startTime = performance.now();
    try {
      const response = await api.post(`/api/database/connections/${dbConnection.connectionId}/query`, {
        query: generatedSQL
      });

      if (response.data.success) {
        const payload = response.data.data || {};
        const executionTime = performance.now() - startTime;
        const resultCount = (payload.rows || []).length;
        
        applyQueryResults(payload.rows || [], payload.columns || [], {
          rowCount: payload.rowCount,
          executionTime: payload.executionTime || executionTime,
          provider: payload.provider || 'manual',
          intent: payload.intent || 'manual_execute'
        });
        
        // Save to query history
        saveQueryToHistory(generatedSQL, executionTime, resultCount, 'success');
        showNotification('Query executed successfully!', 'success');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      saveQueryToHistory(generatedSQL, performance.now() - startTime, 0, 'error', errorMessage);
      showNotification('Failed to execute query. Please check your SQL syntax.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoResults = () => {
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

    return { rows, columns };
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

  const handleCopyResults = () => {
    if (!queryResults.length) {
      showNotification('No results to copy', 'warning');
      return;
    }

    const payload = {
      columns: queryResultColumns,
      rows: queryResults
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => showNotification('Results copied', 'success'))
      .catch(() => showNotification('Failed to copy results', 'error'));
  };

  const handleExportResults = () => {
    const columns = queryResultColumns.length
      ? queryResultColumns
      : queryResults[0]
        ? Object.keys(queryResults[0])
        : [];

    if (!columns.length) {
      showNotification('No results to export', 'warning');
      return;
    }

    const csvRows = [columns.join(',')];
    queryResults.forEach((row) => {
      const cells = columns.map((column) => {
        const raw = row?.[column];
        if (raw === null || raw === undefined) {
          return '""';
        }
        const value = typeof raw === 'object'
          ? JSON.stringify(raw)
          : String(raw);
        return `"${value.replace(/"/g, '""')}"`;
      });
      csvRows.push(cells.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'results.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    showNotification('Results exported as CSV', 'success');
  };

  const handleSaveSQL = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('savedQueries') || '[]');
      const entry = { sql: generatedSQL, explanation, createdAt: new Date().toISOString() };
      existing.unshift(entry);
      localStorage.setItem('savedQueries', JSON.stringify(existing.slice(0, 50)));
      showNotification('Query saved locally', 'success');
    } catch (e) {
      showNotification('Failed to save query', 'error');
    }
  };

  const saveQueryToHistory = (sql, executionTime = 0, resultCount = 0, status = 'success', errorMessage = null) => {
    try {
      const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
      const entry = {
        sql,
        explanation,
        executedAt: new Date().toISOString(),
        executionTime,
        resultCount,
        status,
        errorMessage
      };
      history.unshift(entry);
      // Keep only last 100 queries
      localStorage.setItem('queryHistory', JSON.stringify(history.slice(0, 100)));
    } catch (e) {
      console.error('Error saving query to history:', e);
    }
  };

  const handleFormatSQL = () => {
    // Very simple formatting: add newlines before common clauses and collapse multiple spaces
    let formatted = generatedSQL.replace(/\s+/g, ' ');
    formatted = formatted.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|JOIN|ON|HAVING)\s+/ig, '\n$1 ');
    setGeneratedSQL(formatted);
    showNotification('SQL formatted', 'success');
  };

  const handleConnectDatabase = () => {
    setShowDbModal(true);
  };

  const handleRefreshSchema = async () => {
    if (!dbConnection?.connectionId) {
      showNotification('Connect a database first to explore the schema.', 'warning');
      return;
    }
    await fetchSchema(dbConnection.connectionId);
  };

  const formatDefaultValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return '[object]';
      }
    }
    return String(value);
  };

  const formatResultValue = (value) => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return '[object]';
      }
    }
    return String(value);
  };

  const handleGenerateDescribe = async (tableName) => {
    if (!dbConnection?.connectionId || !tableName) return;
    try {
      setLoading(true);
      const response = await api.post(`/api/database/connections/${dbConnection.connectionId}/generate-sql`, {
        description: `Describe the table ${tableName} and suggest a useful query.`
      });

      if (response.data?.success) {
        const { sql, explanation } = response.data.data;
        setGeneratedSQL(sql);
        setExplanation(explanation || `Description for table ${tableName}`);
        setActiveTab('sql');
        showNotification(`Generated description and query for ${tableName}`, 'success');
      }
    } catch (error) {
      console.error('Error generating table summary:', error);
      showNotification('Failed to generate table summary.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySchema = (table) => {
    if (!table) return;
    const payload = {
      table: table.name,
      columns: table.columns
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => showNotification('Schema copied to clipboard', 'success'))
      .catch(() => showNotification('Failed to copy schema', 'error'));
  };

  const handleGenerateColumnInsight = async (tableName, column) => {
    if (!dbConnection?.connectionId || !tableName || !column) return;
    try {
      setLoading(true);
      const response = await api.post(`/api/database/connections/${dbConnection.connectionId}/generate-sql`, {
        description: `Provide insights or useful query for column ${column.name} in table ${tableName}.`
      });

      if (response.data?.success) {
        const { sql, explanation } = response.data.data;
        setGeneratedSQL(sql);
        setExplanation(explanation || `Insight for ${tableName}.${column.name}`);
        
        // Smart display: Show explanation tab if available, otherwise show SQL
        if (explanation) {
          setActiveTab('explanation');
          showNotification(`💡 Insight generated for ${column.name}. Check explanation tab!`, 'success');
        } else {
          setActiveTab('sql');
          showNotification(`Insight generated for ${column.name}`, 'success');
        }
      }
    } catch (error) {
      console.error('Error generating column insight:', error);
      showNotification('Failed to generate column insight.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDbConfigChange = (field, value) => {
    setDbConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    // If connection string is provided, skip other required fields
    if (!dbConfig.connectionString && (!dbConfig.type || !dbConfig.host || !dbConfig.database || !dbConfig.username)) {
      showNotification('Please fill in all required fields or provide a connection string', 'warning');
      return;
    }

    setLoading(true);
    try {
      let payload;
      if (dbConfig.connectionString) {
        payload = { connectionString: dbConfig.connectionString };
      } else {
        payload = { ...dbConfig };
        delete payload.connectionString;
      }
      const response = await api.post('/api/database/test-connection', payload);

      if (response.data.success) {
        showNotification('Connection test successful!', 'success');
      } else {
        showNotification('Connection test failed: ' + (response.data.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Connection test failed. Please check your configuration.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDbConnect = async (e) => {
    e.preventDefault();
    if (!dbConfig.connectionString && (!dbConfig.type || !dbConfig.host || !dbConfig.database || !dbConfig.username)) {
      showNotification('Please fill in all required fields or provide a connection string', 'warning');
      return;
    }

    setLoading(true);

    try {
      let payload;
      if (dbConfig.connectionString) {
        payload = { connectionString: dbConfig.connectionString };
      } else {
        payload = { ...dbConfig };
        delete payload.connectionString;
      }
      const response = await api.post('/api/database/connect', payload);

      if (response.data.success) {
        const normalized = normalizeConnection(response.data.data);
        if (normalized) {
          setDbConnection(normalized);
          setConnectionStatus('connected');
          setSchemaSearch('');
          setIsSchemaCollapsed(false);
          await fetchSchema(normalized.connectionId);
        } else {
          showNotification('Connected, but failed to read connection details from the response.', 'warning');
        }
        setShowDbModal(false);
        showNotification('Database connected successfully!', 'success');
        // Reset form
        setDbConfig({
          connectionString: '',
          type: '',
          host: '',
          port: '',
          database: '',
          username: '',
          password: ''
        });
      } else {
        showNotification('Failed to connect: ' + (response.data.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to connect to database. Please check your configuration.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectDatabase = async () => {
    if (!dbConnection?.connectionId) {
      showNotification('No active database connection to disconnect', 'warning');
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await api.delete(`/api/database/connections/${dbConnection.connectionId}`);

      if (response.data?.success) {
        showNotification(response.data.message || 'Database disconnected successfully.', 'info');
  setDbConnection(null);
  setConnectionStatus('disconnected');
  setSchemaData(prev => ({ ...prev, tables: [], loading: false, error: null }));
        setSchemaSearch('');
        setSelectedTable(null);
        setIsSchemaCollapsed(false);
        localStorage.removeItem('devquery.schema');
        await checkExistingConnections();
      } else {
        showNotification(response.data?.message || 'Failed to disconnect from database.', 'error');
      }
    } catch (error) {
      console.error('Error disconnecting database:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to disconnect from database.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefreshChat = () => {
    // Confirm before clearing chat history
    const confirmed = window.confirm(
      'Are you sure you want to clear the chat history? This will delete all conversation messages.'
    );
    
    if (!confirmed) return;

    // Reset chat to initial state
    const welcomeMessage = [
      {
        sender: 'bot',
        type: 'text',
        text: 'Hi! I am your database assistant. Ask me anything about your data.',
        timestamp: new Date().toISOString()
      }
    ];
    
    setChatMessages(welcomeMessage);
    setChatInput('');
    
    // Clear from localStorage
    try {
      localStorage.removeItem('devquery.chatHistory');
    } catch (error) {
      console.error('Failed to clear chat history from storage:', error);
    }
    
    showNotification('Chat cleared. Starting fresh conversation.', 'info');
  };

  const handleExportChat = (format = 'json') => {
    try {
      let content, filename, mimeType;
      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        // Export as JSON
        content = JSON.stringify({
          exportedAt: new Date().toISOString(),
          messageCount: chatMessages.length,
          database: dbConnection?.database || 'Unknown',
          messages: chatMessages
        }, null, 2);
        filename = `devquery-chat-${timestamp}.json`;
        mimeType = 'application/json';
      } else if (format === 'markdown') {
        // Export as Markdown
        const lines = [
          `# DevQuery Chat Export`,
          `**Date:** ${new Date().toLocaleString()}`,
          `**Database:** ${dbConnection?.database || 'Unknown'}`,
          `**Messages:** ${chatMessages.length}`,
          '',
          '---',
          ''
        ];

        chatMessages.forEach((msg, idx) => {
          const sender = msg.sender === 'bot' ? '🤖 **Assistant**' : '👤 **You**';
          const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
          lines.push(`### ${sender} ${time ? `(${time})` : ''}`);
          
          if (msg.type === 'sql') {
            lines.push('```sql');
            lines.push(msg.text);
            lines.push('```');
          } else if (msg.type === 'results') {
            try {
              const data = JSON.parse(msg.text);
              lines.push(`*Query returned ${data.rows?.length || 0} rows*`);
            } catch (e) {
              lines.push(msg.text);
            }
          } else {
            lines.push(msg.text);
          }
          lines.push('');
        });

        content = lines.join('\n');
        filename = `devquery-chat-${timestamp}.md`;
        mimeType = 'text/markdown';
      } else if (format === 'txt') {
        // Export as plain text
        const lines = [
          'DevQuery Chat Export',
          `Date: ${new Date().toLocaleString()}`,
          `Database: ${dbConnection?.database || 'Unknown'}`,
          `Messages: ${chatMessages.length}`,
          '',
          '=' .repeat(60),
          ''
        ];

        chatMessages.forEach((msg) => {
          const sender = msg.sender === 'bot' ? 'Assistant' : 'You';
          const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
          lines.push(`[${sender}] ${time}`);
          lines.push(msg.text);
          lines.push('-'.repeat(60));
          lines.push('');
        });

        content = lines.join('\n');
        filename = `devquery-chat-${timestamp}.txt`;
        mimeType = 'text/plain';
      }

      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close dropdown menu
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
      });

      showNotification(`📥 Chat exported as ${format.toUpperCase()} (${chatMessages.length} messages)`, 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showNotification('Failed to export chat. Please try again.', 'error');
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

  // Quick examples removed - will be implemented differently
  
  const handleExampleClick = (example) => {
    setNaturalLanguageInput(example);
    // Focus the textarea
    const textarea = document.getElementById('naturalLanguageInput');
    if (textarea) {
      textarea.focus();
    }
  };

  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages, assistantLoading]);

  return (
    <div className={`dashboard${isSidebarOpen ? '' : ' sidebar-closed'}`}>
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="logo">
          <img src={logoImg} alt="DevQuery Logo" />
          <span>DevQuery</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li className="active">
              <a href="#sql-generator">
                <i className="fas fa-database"></i>
                <span>Query Generator</span>
              </a>
            </li>
            <li>
              <button 
                className="sidebar-btn"
                onClick={() => setShowQueryHistoryModal(true)}
                title="View query history from last 24 hours"
              >
                <i className="fas fa-history"></i>
                <span>Query History</span>
              </button>
            </li>
            <li>
              <a href="#schema-explorer">
                <i className="fas fa-sitemap"></i>
                <span>Schema Explorer</span>
              </a>
            </li>
            <li>
              <button 
                className="sidebar-btn"
                onClick={() => setShowSavedQueriesModal(true)}
                title="View and manage saved queries"
              >
                <i className="fas fa-bookmark"></i>
                <span>Saved Queries</span>
              </button>
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
      <div className="main-content chat-fullscreen">
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="btn icon-btn sidebar-toggle"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label="Toggle sidebar"
            >
              <i className="fas fa-bars"></i>
            </button>
            <h1>Database Chat</h1>
          </div>
          <div className="header-right">
            <button className="btn btn-secondary" onClick={() => drawerDispatch({ type: 'OPEN_DRAWER' })}>
              <i className="fas fa-database"></i>
              Query Generator
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowWhitelistModal(true)}
              title="Manage AI whitelist permissions"
            >
              <i className="fas fa-lock"></i>
              🔐 Whitelist
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleRefreshChat}
              title="Clear chat history and start fresh"
            >
              <i className="fas fa-redo"></i>
              Refresh Chat
            </button>
            <div className="btn-group">
              <button 
                className="btn btn-secondary dropdown-toggle"
                title="Export chat history"
                onClick={(e) => {
                  const menu = e.currentTarget.nextElementSibling;
                  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }}
              >
                <i className="fas fa-download"></i>
                Export
              </button>
              <div className="dropdown-menu" style={{ display: 'none' }}>
                <button onClick={() => handleExportChat('json')}>
                  <i className="fas fa-file-code"></i> JSON
                </button>
                <button onClick={() => handleExportChat('markdown')}>
                  <i className="fas fa-file-alt"></i> Markdown
                </button>
                <button onClick={() => handleExportChat('txt')}>
                  <i className="fas fa-file-text"></i> Text
                </button>
              </div>
            </div>
            <div
              className={`connection-status ${connectionStatus}`}
              title={connectionStatus === 'connected'
                ? `${dbConnection?.dbType?.toUpperCase() || 'DB'}${dbConnection?.database ? ` • ${dbConnection.database}` : ''}`
                : 'No active database connection'}
            >
              <i className="fas fa-circle"></i>
              <span>
                {connectionStatus === 'connected'
                  ? (dbConnection?.connectionName || 'Connected')
                  : 'Disconnected'}
              </span>
            </div>
            {connectionStatus === 'connected' ? (
              <button
                className="btn btn-outline-danger"
                onClick={handleDisconnectDatabase}
                disabled={isDisconnecting}
              >
                <i className="fas fa-unlink"></i>
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleConnectDatabase}>
                <i className="fas fa-plug"></i>
                Connect Database
              </button>
            )}
          </div>
        </header>

        {/* Fullscreen Chatbox */}
        <div className="chat-main fullscreen">
          <div className="chat-messages-main" ref={chatMessagesContainerRef}>
            {chatMessages.map((msg, idx) => {
              const key = `${msg.timestamp || idx}-${idx}`;
              const typeClass = msg.type ? ` ${msg.type}` : '';
              
              // Handle results type for inline display
              if (msg.type === 'results') {
                try {
                  const data = JSON.parse(msg.text);
                  const cols = data.columns || [];
                  const rows = data.rows || [];
                  
                  return (
                    <div key={key} className={`chat-msg ${msg.sender}${typeClass}`}>
                      <div className="chat-results-table">
                        {cols.length > 0 ? (
                          <table>
                            <thead>
                              <tr>
                                {cols.map((col) => (
                                  <th key={col}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length > 0 ? (
                                rows.map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    {cols.map((col) => (
                                      <td key={col}>{formatResultValue(row?.[col])}</td>
                                    ))}
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={cols.length}>No rows returned.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <p>No results available.</p>
                        )}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div key={key} className={`chat-msg ${msg.sender}${typeClass}`}>
                      <span>{msg.text}</span>
                    </div>
                  );
                }
              }
              
              return (
                <div key={key} className={`chat-msg ${msg.sender}${typeClass}`}>
                  {msg.type === 'sql' ? <pre>{msg.text}</pre> : <span>{msg.text}</span>}
                </div>
              );
            })}
            {assistantLoading && (
              <div className="chat-msg bot chat-typing">
                <span>Thinking</span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          <form className="chat-footer-main" onSubmit={handleSendChat} autoComplete="off">
            <input
              id="mainChatInput"
              type="text"
              className="chat-input-main"
              placeholder="Ask about your data..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              autoFocus
              disabled={assistantLoading}
            />
            <button type="submit" className="btn btn-primary chat-send-main" disabled={!chatInput.trim() || assistantLoading}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>

        {isSchemaCollapsed ? (
          <div id="schema-explorer" className="schema-collapsed-card">
            <div className="schema-collapsed-content">
              <div className="schema-collapsed-info">
                <span className="schema-collapsed-icon">
                  <i className="fas fa-sitemap"></i>
                </span>
                <div>
                  <h3>Schema Explorer hidden</h3>
                  <p>Reopen to browse tables, columns, and AI insights.</p>
                </div>
              </div>
              <div className="schema-collapsed-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRefreshSchema}
                  disabled={schemaData.loading || !dbConnection}
                >
                  <i className={`fas ${schemaData.loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                  {schemaData.loading ? 'Refreshing...' : 'Refresh Schema'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setIsSchemaCollapsed(false)}>
                  <i className="fas fa-eye"></i>
                  Show Explorer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <section id="schema-explorer" className="schema-explorer">
            <div className="schema-explorer-header">
              <div className="schema-title">
                <h2>Schema Explorer</h2>
                <p>Browse {dbConnection?.dbType === 'mongodb' ? 'collections, inspect fields' : 'tables, inspect columns'}, and generate docs without leaving DevQuery.</p>
              </div>
              <div className="schema-toolbar">
                <div className="schema-search">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder={dbConnection?.dbType === 'mongodb' ? 'Search collections or fields' : 'Search tables or columns'}
                    value={schemaSearch}
                    onChange={(e) => setSchemaSearch(e.target.value)}
                  />
                </div>
                <div className="schema-view-toggle">
                  <button
                    className={`btn btn-sm ${schemaViewMode === 'tables' ? 'active' : ''}`}
                    onClick={() => setSchemaViewMode('tables')}
                  >
                    <i className={`fas ${dbConnection?.dbType === 'mongodb' ? 'fa-layer-group' : 'fa-table'}`}></i>
                    {dbConnection?.dbType === 'mongodb' ? 'Collections' : 'Tables'}
                  </button>
                  <button
                    className={`btn btn-sm ${schemaViewMode === 'erd' ? 'active' : ''}`}
                    onClick={() => setSchemaViewMode('erd')}
                    title="Entity Relationship Diagram"
                  >
                    <i className="fas fa-project-diagram"></i>
                    ERD
                  </button>
                  <button
                    className={`btn btn-sm ${schemaViewMode === 'docs' ? 'active' : ''}`}
                    onClick={() => setSchemaViewMode('docs')}
                    title="Auto-generated Documentation"
                  >
                    <i className="fas fa-file-alt"></i>
                    Docs
                  </button>
                </div>
                <div className="schema-toolbar-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleRefreshSchema}
                    disabled={schemaData.loading || !dbConnection}
                  >
                    <i className={`fas ${schemaData.loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                    {schemaData.loading ? 'Refreshing...' : 'Refresh Schema'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost schema-collapse-btn"
                    onClick={() => setIsSchemaCollapsed(true)}
                    title="Hide schema explorer"
                  >
                    <i className="fas fa-eye-slash"></i>
                    Hide
                  </button>
                </div>
              </div>
            </div>

            <div className="schema-body">
              {/* Tables View */}
              {schemaViewMode === 'tables' && (
                <>
                  <div className="schema-sidebar">
                    <div className="schema-connection-info">
                      <div className="schema-connection-name">
                        <i className={`fas ${dbConnection?.dbType === 'mongodb' ? 'fa-leaf' : 'fa-plug'}`}></i>
                        <span>{connectionStatus === 'connected' ? (dbConnection?.connectionName || 'Active Connection') : 'Not Connected'}</span>
                      </div>
                      <small>
                        {dbConnection ? (
                          <>
                            <span className={`db-type-badge ${dbConnection.dbType === 'mongodb' ? 'mongodb' : 'sql'}`}>
                              {dbConnection.dbType?.toUpperCase()}
                            </span>
                            {dbConnection.database && ` • ${dbConnection.database}`}
                          </>
                        ) : (
                          'Connect to explore schema'
                        )}
                      </small>
                    </div>

                    {schemaData.loading && (
                      <div className="schema-loading">
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Loading {dbConnection?.dbType === 'mongodb' ? 'collections' : 'schema'}...</span>
                      </div>
                    )}

                    {!schemaData.loading && schemaData.tables.length === 0 && (
                      <div className="schema-empty">
                        <i className={`fas ${dbConnection?.dbType === 'mongodb' ? 'fa-layer-group' : 'fa-database'}`}></i>
                        <p>
                          {dbConnection?.dbType === 'mongodb' 
                            ? 'No collections found in your MongoDB database.' 
                            : 'No schema information available.'}
                        </p>
                        {connectionStatus === 'connected' && dbConnection?.dbType === 'mongodb' && (
                          <div style={{ marginTop: '12px', fontSize: '0.9em', color: '#888' }}>
                            <p style={{ marginBottom: '8px' }}>💡 Your database appears to be empty.</p>
                            <p style={{ marginBottom: '4px' }}>Add data using MongoDB shell:</p>
                            <code style={{ 
                              display: 'block', 
                              background: '#2a2a2a', 
                              padding: '8px', 
                              borderRadius: '4px',
                              marginTop: '8px',
                              fontSize: '0.85em',
                              color: '#00ed64'
                            }}>
                              db.users.insertOne(&#123; name: "Test" &#125;)
                            </code>
                            <p style={{ marginTop: '8px', fontSize: '0.85em' }}>Then click "Refresh Schema" above.</p>
                          </div>
                        )}
                        {connectionStatus === 'connected' && dbConnection?.dbType !== 'mongodb' && (
                          <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#888' }}>
                            Try refreshing or running a query first.
                          </p>
                        )}
                        {connectionStatus !== 'connected' && (
                          <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#888' }}>
                            Connect a database to get started.
                          </p>
                        )}
                      </div>
                    )}

                    {!schemaData.loading && schemaData.tables.length > 0 && filteredTables.length === 0 && (
                      <div className="schema-empty schema-empty-compact">
                        <i className="fas fa-search"></i>
                        <p>No matches found. Try a different search term.</p>
                      </div>
                    )}

                    {!schemaData.loading && filteredTables.length > 0 && (
                      <div className="schema-table-list">
                        {filteredTables.map((table, index) => {
                          const totalColumnCount = Array.isArray(table?.columns) ? table.columns.length : 0;
                          const matchCount = countMatchingColumns(table);
                          const isMongoDB = dbConnection?.dbType === 'mongodb';
                          const itemLabel = isMongoDB ? 'field' : 'column';
                          const metaLabel = hasSearch
                            ? `${matchCount} match${matchCount === 1 ? '' : 'es'}`
                            : `${totalColumnCount} ${itemLabel}${totalColumnCount === 1 ? '' : 's'}`;

                          return (
                            <button
                              type="button"
                              key={table.name || `table-${index}`}
                              className={`schema-table-item ${selectedTable?.name === table.name ? 'active' : ''} ${isMongoDB ? 'mongodb-collection' : ''}`}
                              onClick={() => setSelectedTable(table)}
                            >
                              <div className="schema-table-name">
                                <i className={`fas ${isMongoDB ? 'fa-layer-group' : 'fa-table'}`} style={{marginRight: '6px', opacity: 0.6, fontSize: '0.9em'}}></i>
                                <span>{renderHighlight(table.name, table.name || '—')}</span>
                              </div>
                              <div className="schema-table-meta">{metaLabel}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="schema-details">
                {selectedTable ? (
                  <div className="schema-table-details">
                    <div className="schema-table-header">
                      <div className="schema-table-title">
                        <h3>{renderHighlight(selectedTable.name, selectedTable.name || '—')}</h3>
                        <span className="schema-column-count">{columnCountLabel}</span>
                      </div>
                      <div className="schema-table-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleGenerateDescribe(selectedTable.name)}
                          disabled={!dbConnection}
                        >
                          <i className="fas fa-magic"></i>
                          Generate Summary
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleCopySchema(selectedTable)}
                        >
                          <i className="fas fa-copy"></i>
                          Copy Schema Snapshot
                        </button>
                      </div>
                    </div>

                    <div className="schema-columns">
                      <table>
                        <thead>
                          <tr>
                            <th>{dbConnection?.dbType === 'mongodb' ? 'Field' : 'Column'}</th>
                            <th>Type</th>
                            <th>{dbConnection?.dbType === 'mongodb' ? 'Nullable' : 'Nullable'}</th>
                            <th>{dbConnection?.dbType === 'mongodb' ? 'Sample Value' : 'Default / Sample'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleColumns.length > 0 ? (
                            visibleColumns.map((column, index) => {
                              const columnKey = `${column.name || column.type || 'column'}-${index}`;
                              const columnType = column.type || 'unknown';
                              const defaultText = formatDefaultValue(column.defaultValue ?? column.sample);

                              return (
                                <tr key={columnKey}>
                                  <td>
                                    <div className="column-name">
                                      <span>{renderHighlight(column.name, column.name || '—')}</span>
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => handleGenerateColumnInsight(selectedTable.name, column)}
                                        disabled={!dbConnection}
                                        title="Generate insights"
                                      >
                                        <i className="fas fa-lightbulb"></i>
                                      </button>
                                    </div>
                                  </td>
                                  <td>{renderHighlight(columnType, columnType)}</td>
                                  <td>{column.nullable ? 'Yes' : 'No'}</td>
                                  <td>
                                    <code>{renderHighlight(defaultText, defaultText)}</code>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="schema-empty-row">
                              <td colSpan="4">
                                {hasSearch
                                  ? 'No columns match your search. Try a different keyword.'
                                  : 'This table has no columns to display.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="schema-placeholder">
                    <i className="fas fa-table"></i>
                    <p>{filteredTables.length === 0 
                      ? `No ${dbConnection?.dbType === 'mongodb' ? 'collections' : 'tables'} match your search. Clear the filter to explore everything.` 
                      : `Select a ${dbConnection?.dbType === 'mongodb' ? 'collection' : 'table'} on the left to view its ${dbConnection?.dbType === 'mongodb' ? 'fields' : 'columns'} and insights.`}
                    </p>
                  </div>
                )}
              </div>
                </>
              )}

              {/* ERD View */}
              {schemaViewMode === 'erd' && (
                <div className="erd-view">
                  {schemaData.loading ? (
                    <div className="erd-loading">
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Loading schema...</span>
                    </div>
                  ) : schemaData.tables.length === 0 ? (
                    <div className="erd-empty">
                      <i className="fas fa-project-diagram"></i>
                      <p>No schema available. Connect to a database to view ERD.</p>
                    </div>
                  ) : (
                    <ERDRenderer tables={filteredTables} onTableClick={setSelectedTable} />
                  )}
                </div>
              )}

              {/* Docs View */}
              {schemaViewMode === 'docs' && (
                <div className="docs-view">
                  {schemaData.loading ? (
                    <div className="docs-loading">
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Generating documentation...</span>
                    </div>
                  ) : schemaData.tables.length === 0 ? (
                    <div className="docs-empty">
                      <i className="fas fa-file-alt"></i>
                      <p>No schema available. Connect to a database to generate documentation.</p>
                    </div>
                  ) : (
                    <DocsRenderer tables={filteredTables} dbConnection={dbConnection} />
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* SQL Drawer (sliding window) */}
      <div
        className={`sql-drawer${showSQLDrawer ? ' open' : ''} ${dragEnabled ? 'drag-enabled' : ''} ${isFullscreen ? ' fullscreen' : ''}`}
        style={{
          right: showSQLDrawer ? `${drawerPos.right}px` : `-9999px`,
          top: `${drawerPos.top}px`,
          width: `${drawerSize.width}px`,
          height: `${drawerSize.height}px`,
        }}
      >
        <div
          className="sql-drawer-header"
          onDoubleClick={() => drawerDispatch({ type: 'TOGGLE_DRAG_ENABLED' })}
          onPointerDown={(e) => {
            // start dragging only when dragEnabled and left button
            if (!dragEnabled) return;
            if (e.button !== 0) return;
            drawerDispatch({ type: 'SET_DRAGGING', payload: true });
            dragRef.current.startX = e.clientX;
            dragRef.current.startY = e.clientY;
            dragRef.current.startRight = drawerPos.right;
            dragRef.current.startTop = drawerPos.top;
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>SQL Query Generator</h2>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const next = !isFullscreen;
                drawerDispatch({ type: 'TOGGLE_FULLSCREEN', payload: next });
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="close-sql"
              onPointerDown={(e) => { e.stopPropagation(); }}
                  onClick={() => drawerDispatch({ type: 'CLOSE_DRAWER' })}
              title="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div className="sql-drawer-body">
          {/* Quick examples section removed - will be implemented differently */}
          
          <div className="result-tabs">
            <button className={`tab-btn ${activeTab === 'sql' ? 'active' : ''}`} onClick={() => setActiveTab('sql')}>Generated SQL</button>
            <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Query Results</button>
            <button className={`tab-btn ${activeTab === 'explanation' ? 'active' : ''}`} onClick={() => setActiveTab('explanation')}>Explanation</button>
          </div>

          <div className="tab-content">
            {activeTab === 'sql' && (
              <div className="sql-view">
                <div className="sql-editor">
                  <div className="editor-header">
                    <div className="editor-title">Generated SQL</div>
                    <div className="editor-actions">
                      <span className="query-info">Estimated rows: {estimatedRows}</span>
                      <button className="btn btn-success" onClick={handleExecuteQuery} disabled={!dbConnection || loading}>
                        <i className="fas fa-play"></i>
                        {loading ? 'Executing...' : 'Execute'}
                      </button>
                      <button className="btn btn-sm" onClick={handleCopySQL} title="Copy to clipboard">
                        <i className="fas fa-copy"></i>
                      </button>
                      <button className="btn btn-sm" onClick={handleSaveSQL} title="Save query">
                        <i className="fas fa-save"></i>
                      </button>
                      <button className="btn btn-sm" onClick={handleFormatSQL} title="Format SQL">
                        <i className="fas fa-code"></i>
                      </button>
                    </div>
                  </div>
                  <div className="code-editor">
                    <textarea
                      className="sql-editor-textarea"
                      value={generatedSQL}
                      onChange={(e) => setGeneratedSQL(e.target.value)}
                      placeholder="Your generated SQL will appear here..."
                      spellCheck="false"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'results' && (
              <div className="results-view">
                <div className="results-header">
                  <div>
                    <div className="results-title">Query Results</div>
                    <div className="results-meta">
                      <span className="results-count">{queryMetadata?.rowCount ?? queryResults.length} rows</span>
                      {typeof queryMetadata?.executionTime === 'number' && (
                        <span className="results-chip">Execution {queryMetadata.executionTime} ms</span>
                      )}
                      {queryMetadata?.provider && (
                        <span className="results-chip">{queryMetadata.provider === 'assistant' ? 'Assistant' : queryMetadata.provider}</span>
                      )}
                      {queryMetadata?.model && (
                        <span className="results-chip neutral">{queryMetadata.model}</span>
                      )}
                      {queryMetadata?.confidence && (
                        <span className="results-chip neutral">Confidence: {queryMetadata.confidence}</span>
                      )}
                    </div>
                  </div>
                  <div className="results-actions">
                    <button className="btn btn-sm" onClick={handleCopyResults} disabled={!queryResults.length} title="Copy JSON">
                      <i className="fas fa-copy"></i>
                    </button>
                    <button className="btn btn-sm" onClick={handleExportResults} disabled={!queryResults.length} title="Export CSV">
                      <i className="fas fa-file-csv"></i>
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
                      <p>{queryMetadata?.intent === 'execute_query' ? 'Query executed but returned no rows.' : 'Execute a query to see results.'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'explanation' && (
              <div className="explanation-view">
                <div className="explanation-header">
                  <h4>Explanation</h4>
                </div>
                <div className="explanation-content">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Resizer handle */}
        <div
          className="sql-drawer-resizer"
          onPointerDown={(e) => {
            // left button only
            if (e.button !== 0) return;
            drawerDispatch({ type: 'SET_RESIZING', payload: true });
            dragRef.current.startX = e.clientX;
            dragRef.current.startY = e.clientY;
            dragRef.current.startWidth = drawerSize.width;
            dragRef.current.startHeight = drawerSize.height;
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
        />
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
                  <label htmlFor="dbConnectionString">Connection String (recommended for MongoDB)</label>
                  <input
                    type="text"
                    id="dbConnectionString"
                    placeholder="e.g. mongodb+srv://Genesis:genesis@2025@genesis.2l3xrq4.mongodb.net/"
                    value={dbConfig.connectionString}
                    onChange={e => handleDbConfigChange('connectionString', e.target.value)}
                  />
                  <small style={{ color: '#888' }}>If provided, all other fields are optional. Supports MongoDB, PostgreSQL, MySQL, etc.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="dbType">Database Type *</label>
                  <select
                    id="dbType"
                    value={dbConfig.type}
                    onChange={(e) => handleDbConfigChange('type', e.target.value)}
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
                      ✓ MongoDB selected - Schema Explorer will show Collections & Fields
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
                    onChange={(e) => handleDbConfigChange('host', e.target.value)}
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
                    onChange={(e) => handleDbConfigChange('port', e.target.value)}
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
                    onChange={(e) => handleDbConfigChange('database', e.target.value)}
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
                    onChange={(e) => handleDbConfigChange('username', e.target.value)}
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
                    onChange={(e) => handleDbConfigChange('password', e.target.value)}
                    disabled={!!dbConfig.connectionString}
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

      {/* Whitelist Manager Modal */}
      <WhitelistManager 
        isOpen={showWhitelistModal}
        onClose={() => setShowWhitelistModal(false)}
        connectionId={dbConnection?.connectionId}
        dbSchema={schemaData.tables}
        user={user}
      />

      {/* Saved Queries Modal */}
      <SavedQueries
        isOpen={showSavedQueriesModal}
        onClose={() => setShowSavedQueriesModal(false)}
        onExecuteQuery={(sql) => {
          setGeneratedSQL(sql);
          handleExecuteQuery();
        }}
        showNotification={showNotification}
      />

      {/* Query History Modal */}
      <QueryHistory
        isOpen={showQueryHistoryModal}
        onClose={() => setShowQueryHistoryModal(false)}
        onExecuteQuery={(sql) => {
          setGeneratedSQL(sql);
          handleExecuteQuery();
        }}
        showNotification={showNotification}
      />

      {/* Write Confirmation Modal */}
      {showWriteConfirmation && pendingWriteOperation && (
        <div className="modal write-confirmation-modal" onClick={(e) => {
          if (e.target.className === 'modal write-confirmation-modal') {
            handleCancelWrite();
          }
        }}>
          <div className="modal-content write-confirmation-content">
            <div className="write-confirmation-header">
              <h2>⚠️ Confirm Database Write Operation</h2>
              <button className="close-btn" onClick={handleCancelWrite}>×</button>
            </div>
            
            <div className="write-confirmation-body">
              <div className="confirmation-message">
                <p>{pendingWriteOperation.message}</p>
              </div>
              
              <div className="sql-preview-section">
                <h3>SQL Statement to Execute:</h3>
                <div className="sql-preview-box">
                  <pre><code>{pendingWriteOperation.sql}</code></pre>
                </div>
              </div>
              
              {pendingWriteOperation.affectedTable && (
                <div className="operation-details">
                  <div className="detail-item">
                    <strong>Table:</strong> <span className="table-name">{pendingWriteOperation.affectedTable}</span>
                  </div>
                  {pendingWriteOperation.affectedColumns && pendingWriteOperation.affectedColumns.length > 0 && (
                    <div className="detail-item">
                      <strong>Columns:</strong> <span className="columns-list">{pendingWriteOperation.affectedColumns.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="confirmation-warning">
                <i className="fas fa-exclamation-triangle"></i>
                <p>This operation will modify your database. Please review carefully before confirming.</p>
              </div>
            </div>
            
            <div className="write-confirmation-footer">
              <button 
                className="btn btn-cancel" 
                onClick={handleCancelWrite}
                disabled={assistantLoading}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
              <button 
                className="btn btn-confirm" 
                onClick={handleConfirmWrite}
                disabled={assistantLoading}
              >
                {assistantLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Executing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal/Popup */}
      {showResultsModal && (
        <div className="modal results-modal" onClick={(e) => {
          if (e.target.className === 'modal results-modal') {
            setShowResultsModal(false);
          }
        }}>
          <div className="modal-content results-modal-content">
            <div className="modal-header">
              <h3>Query Results</h3>
              <button className="close-modal" onClick={() => setShowResultsModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body results-modal-body">
              <div className="results-header">
                <div>
                  <div className="results-title">Results</div>
                  <div className="results-meta">
                    <span className="results-count">{queryMetadata?.rowCount ?? queryResults.length} rows</span>
                    {typeof queryMetadata?.executionTime === 'number' && (
                      <span className="results-chip">Execution {queryMetadata.executionTime} ms</span>
                    )}
                    {queryMetadata?.provider && (
                      <span className="results-chip">{queryMetadata.provider === 'assistant' ? 'Assistant' : queryMetadata.provider}</span>
                    )}
                    {queryMetadata?.model && (
                      <span className="results-chip neutral">{queryMetadata.model}</span>
                    )}
                    {queryMetadata?.confidence && (
                      <span className="results-chip neutral">Confidence: {queryMetadata.confidence}</span>
                    )}
                  </div>
                </div>
                <div className="results-actions">
                  <button className="btn btn-sm" onClick={handleCopyResults} disabled={!queryResults.length} title="Copy JSON">
                    <i className="fas fa-copy"></i> Copy
                  </button>
                  <button className="btn btn-sm" onClick={handleExportResults} disabled={!queryResults.length} title="Export CSV">
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
      )}

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification notification-${notification.type}`}>
            <i className={`fas fa-${getNotificationIcon(notification.type)}`}></i>
            <span>{notification.message}</span>
            <button 
              className="close-notification" 
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
              title="Close"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
