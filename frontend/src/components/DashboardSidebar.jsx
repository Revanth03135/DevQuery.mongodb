import { Link } from 'react-router-dom';
import logoImg from '../assets/img1.png';

/**
 * Dashboard Sidebar Component
 * Contains logo, navigation menu, and user profile section
 */
const DashboardSidebar = ({
    isOpen,
    user,
    onOpenQueryHistory,
    onOpenSavedQueries,
    onOpenDrawer,
    onLogout
}) => {
    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="logo">
                <img src={logoImg} alt="DevQuery Logo" />
                <span>DevQuery</span>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    <li>
                        <button
                            className="sidebar-btn"
                            onClick={onOpenDrawer}
                            title="Open SQL Query Generator drawer"
                        >
                            <i className="fas fa-database"></i>
                            <span>Query Generator</span>
                        </button>
                    </li>
                    <li>
                        <button
                            className="sidebar-btn"
                            onClick={onOpenQueryHistory}
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
                            onClick={onOpenSavedQueries}
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
                    <span className="user-name">{user?.name || user?.username || 'User'}</span>
                    <span className="user-role" style={{ textTransform: 'capitalize' }}>
                        {user?.role || user?.subscriptionTier || 'Developer'}
                    </span>
                </div>
                <button className="logout-btn" onClick={onLogout} title="Logout">
                    <i className="fas fa-sign-out-alt"></i>
                </button>
            </div>
        </div>
    );
};

export default DashboardSidebar;
