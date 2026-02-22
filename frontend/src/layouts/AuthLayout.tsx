import React from "react";
import BrandLogo from "../components/common/BrandLogo";
import "../styles/auth.css";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="auth-page-container">
            {/* Background Overlay */}
            <div className="auth-bg-overlay" />

            {/* Left Panel - Branding/Marketing */}
            <div className="auth-side-panel">
                <div className="auth-logo-container">
                    <BrandLogo variant="full" className="auth-logo-image" />
                </div>

                <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1.5rem', lineHeight: '1.1' }}>
                    Engage your audience like never before.
                </h1>
                <p style={{ fontSize: '1.25rem', color: '#e0e7ff', marginBottom: '3rem', lineHeight: '1.6' }}>
                    Create interactive presentations, live polls, and real-time Q&A sessions that turn passive listeners into active participants.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', marginLeft: '0.75rem' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '50%',
                                background: `rgba(255,255,255,${0.2 * i})`,
                                border: '2px solid #312e81',
                                marginLeft: i > 1 ? '-0.75rem' : '0'
                            }} />
                        ))}
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#c7d2fe' }}>
                        Trusted by innovative teams worldwide
                    </p>
                </div>
            </div>

            {/* Right Panel - Form Container */}
            <div className="auth-form-panel">
                <div className="auth-card-container">
                    {/* Mobile Logo Only */}
                    <div className="auth-logo-container mobile-only" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
                        <BrandLogo variant="full" className="auth-logo-image auth-logo-image-mobile" />
                    </div>

                    <div style={{ marginBottom: '2rem', paddingLeft: '0.25rem' }}>
                        <h2 className="auth-title">{title}</h2>
                        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                    </div>

                    <div className="auth-card">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
