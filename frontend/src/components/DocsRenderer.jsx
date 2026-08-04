import { useState } from 'react';

/**
 * Documentation Renderer Component
 * Generates and exports database documentation in various formats
 */
const DocsRenderer = ({ tables, dbConnection }) => {
    const [format, setFormat] = useState('markdown');

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

export default DocsRenderer;
