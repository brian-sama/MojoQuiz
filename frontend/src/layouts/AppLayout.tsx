/**
 * AppLayout — Unified enterprise layout wrapper
 * Top nav + centered content container
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/common/BrandLogo';
import './AppLayout.css';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    return (
        <div className="app-layout">
            <header className="app-nav">
                <div className="app-nav-inner">
                    <div className="app-nav-left">
                        <NavLink to="/dashboard" className="app-logo">
                            <BrandLogo variant="full" className="app-logo-image" />
                        </NavLink>
                        <nav className="app-nav-links">
                            <NavLink to="/dashboard" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                                Dashboard
                            </NavLink>
                            <NavLink to="/library" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                                Library
                            </NavLink>
                            <NavLink to="/templates" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                                Templates
                            </NavLink>
                        </nav>
                    </div>
                    <div className="app-nav-right">
                        {user && (
                            <div className="app-user-menu">
                                <div className="app-user-avatar">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="app-avatar-img" />
                                    ) : (
                                        <span className="app-avatar-fallback">
                                            {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <div className="app-user-info">
                                    <span className="app-user-name">{user.displayName}</span>
                                    <button onClick={handleLogout} className="app-logout-btn">
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <main className="app-main">
                <div className="app-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
