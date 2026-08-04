import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * ERD (Entity Relationship Diagram) Renderer Component
 * Displays tables in a visual grid layout with relationships
 */
const ERDRenderer = ({ tables, onTableClick }) => {
  console.log('ERDRenderer: tables received:', tables?.length, tables);
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
    // Only drag with left mouse button
    if (e.button === 0) {
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
    const spacing = { x: 380, y: 450 }; // Increased spacing for better readability

    // Calculate total grid size to center it
    const gridWidth = columns * spacing.x;
    const gridHeight = Math.ceil(tables.length / columns) * spacing.y;

    // Initial centering offset (assuming window center)
    // In a real scenario, we might want to get container dimensions, but this is a good approximation
    const offset = {
      x: window.innerWidth / 2 - gridWidth / 2 + 100,
      y: Math.max(100, window.innerHeight / 2 - gridHeight / 2 + 150)
    };

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

  console.log('ERDRenderer: calculated positions:', tablePositions);

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
      <div className="erd-controls" onMouseDown={(e) => e.stopPropagation()}>
        <div className="erd-controls-group">
          <button onClick={handleZoomOut} className="erd-control-btn" title="Zoom Out">
            <i className="fas fa-minus"></i>
          </button>
          <span className="erd-zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="erd-control-btn" title="Zoom In">
            <i className="fas fa-plus"></i>
          </button>
        </div>
        <div className="erd-divider"></div>
        <button onClick={handleResetView} className="erd-control-btn" title="Reset View">
          <i className="fas fa-expand-arrows-alt"></i>
        </button>
      </div>

      <div
        ref={canvasRef}
        className="erd-canvas"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
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
                    stroke="var(--accent-blue)"
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
                <polygon points="0 0, 10 3, 0 6" fill="var(--accent-blue)" />
              </marker>
            </defs>
          </g>
        </svg>

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}>
          {tablePositions.map(({ table, x, y }, idx) => {
            const pkColumns = (table.columns || []).filter(c => c.primaryKey || c.key === 'PRI');
            const fkColumns = (table.columns || []).filter(c => c.name.endsWith('_id'));
            const isSelected = selectedTable?.name === table.name;

            return (
              <div
                key={`table-${idx}`}
                className={`erd-table ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  pointerEvents: 'auto'
                }}
                onClick={(e) => { e.stopPropagation(); handleTableClick(table); }}
                onMouseDown={(e) => e.stopPropagation()}
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

export default ERDRenderer;
