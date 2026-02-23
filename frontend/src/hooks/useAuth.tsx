import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    };

    const attemptRefresh = async (): Promise<boolean> => {
        try {
            const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
            const refreshUrl = apiBase
                ? `${apiBase}${apiBase.endsWith('/api') ? '' : '/api'}/auth/refresh`
                : '/api/auth/refresh';

            const res = await fetch(refreshUrl, {
                method: 'POST',
                credentials: 'include',
            });

            if (!res.ok) {
                logout();
                return false;
            }

            const data = await res.json();
            setToken(data.accessToken);
            localStorage.setItem('auth_token', data.accessToken);

            // User info is already in localStorage, keep it
            const savedUser = localStorage.getItem('auth_user');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }

            return true;
        } catch {
            logout();
            return false;
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const savedToken = localStorage.getItem('auth_token');
            const savedUser = localStorage.getItem('auth_user');

            if (savedToken && savedUser) {
                try {
                    const decoded: any = jwtDecode(savedToken);
                    if (decoded.exp * 1000 < Date.now()) {
                        // Token expired, attempt silent refresh
                        await attemptRefresh();
                    } else {
                        setToken(savedToken);
                        setUser(JSON.parse(savedUser));
                    }
                } catch {
                    logout();
                }
            }

            setLoading(false);
        };

        initializeAuth();
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isAuthenticated: !!token,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
