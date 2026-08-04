import { useTheme } from '../context/ThemeContext';

/**
 * Dashboard Header Component
 * Contains title, action buttons, connection status, and database controls
 */
const DashboardHeader = ({
    isSidebarOpen,
    onToggleSidebar,
    connectionStatus,
    dbConnection,
    isDisconnecting,
    onOpenDrawer,
    onOpenWhitelist,
    onRefreshChat,
    onExportChat,
    onConnectDatabase,
    onDisconnectDatabase
}) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="header">
            <div className="header-left">
                <button
                    type="button"
                    className="btn icon-btn sidebar-toggle"
                    onClick={onToggleSidebar}
                    title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                    aria-label="Toggle sidebar"
                >
                    <i className="fas fa-bars"></i>
                </button>
                <h1>Database Chat</h1>
            </div>
            <div className="header-right">
                {/* Theme & Assistant Tools */}
                <div className="header-action-group">
                    <button
                        className="btn btn-ghost theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        aria-label="Toggle theme"
                    >
                        <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                    </button>
                    <button className="btn btn-secondary" onClick={onOpenDrawer} title="Open SQL Generator panel">
                        <i className="fas fa-code"></i>
                        <span className="btn-text">SQL Drawer</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={onOpenWhitelist}
                        title="Manage AI whitelist permissions"
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span className="btn-text">Whitelist</span>
                    </button>
                </div>

                <div className="header-divider"></div>

                {/* Chat Controls */}
                <div className="header-action-group">
                    <button
                        className="btn btn-ghost icon-btn"
                        onClick={onRefreshChat}
                        title="Clear chat history and start fresh"
                    >
                        <i className="fas fa-redo-alt"></i>
                    </button>
                    <div className="btn-group">
                        <button
                            className="btn btn-ghost icon-btn dropdown-toggle"
                            title="Export chat history"
                            onClick={(e) => {
                                const menu = e.currentTarget.nextElementSibling;
                                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                            }}
                        >
                            <i className="fas fa-download"></i>
                        </button>
                        <div className="dropdown-menu" style={{ display: 'none' }}>
                            <button onClick={() => onExportChat('json')}>
                                <i className="fas fa-file-code"></i> Export JSON
                            </button>
                            <button onClick={() => onExportChat('markdown')}>
                                <i className="fas fa-file-alt"></i> Export Markdown
                            </button>
                            <button onClick={() => onExportChat('txt')}>
                                <i className="fas fa-file-text"></i> Export Text
                            </button>
                        </div>
                    </div>
                </div>

                <div className="header-divider"></div>

                {/* Connection Controls */}
                <div className="header-action-group">
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
                            className="btn btn-outline-danger btn-sm"
                            onClick={onDisconnectDatabase}
                            disabled={isDisconnecting}
                            title="Disconnect active database"
                        >
                            <i className="fas fa-unlink"></i>
                            <span className="btn-text">{isDisconnecting ? '...' : 'Disconnect'}</span>
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-sm" onClick={onConnectDatabase}>
                            <i className="fas fa-plug"></i>
                            <span className="btn-text">Connect DB</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
