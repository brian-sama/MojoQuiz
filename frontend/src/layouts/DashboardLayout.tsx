import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/common/BrandLogo';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
        { label: 'Library', path: '/library', icon: '📚' },
        { label: 'Templates', path: '/templates', icon: '✨' },
        { label: 'Analytics', path: '/analytics', icon: '📊', disabled: true },
    ];

    const isAdmin = user?.role === 'admin';

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand">
                    <Link to="/dashboard" className="brand-link">
                        <BrandLogo variant="full" className="brand-logo-image" />
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.disabled ? '#' : item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                            onClick={(e) => item.disabled && e.preventDefault()}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {isAdmin && (
                        <button
                            className="admin-badge-btn"
                            onClick={() => navigate('/admin')}
                        >
                            🛡️ Admin Portal
                        </button>
                    )}
                    <div className="user-profile-small">
                        <div className="user-avatar-circle">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Avatar" />
                            ) : (
                                <span>{user?.displayName?.[0] || 'U'}</span>
                            )}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.displayName?.split(' ')[0]}</span>
                            <button onClick={logout} className="logout-link">Logout</button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="dashboard-main-wrapper">
                <header className="dashboard-topbar">
                    <div className="topbar-search">
                        <input type="text" placeholder="Search your sessions..." className="topbar-search-input" />
                    </div>
                    <div className="topbar-actions">
                        <button
                            className="btn btn-primary create-btn-ghost"
                            onClick={() => navigate('/create')}
                        >
                            + Create Session
                        </button>
                    </div>
                </header>

                <main className="dashboard-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="content-inner"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
