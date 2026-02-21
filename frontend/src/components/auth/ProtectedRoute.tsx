import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
}

/**
 * Protected Route Wrapper
 * Only allowed for authenticated users
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                navigate('/auth/login');
            } else if (requiredRole && user?.role !== requiredRole) {
                navigate('/dashboard');
            }
        }
    }, [isAuthenticated, loading, navigate, requiredRole, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
