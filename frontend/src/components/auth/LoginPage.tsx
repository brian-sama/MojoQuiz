import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../hooks/useApi";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../layouts/AuthLayout";

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Redirect if already logged in
    React.useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate("/dashboard");
        }
    }, [isAuthenticated, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post("auth/login", {
                email,
                password,
            });

            login(res.accessToken, res.user);
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return null;

    return (
        <AuthLayout title="Welcome Back" subtitle="Sign in to continue to MojoQuiz">
            {error && (
                <div style={{
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #fee2e2'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin}>
                <div className="auth-form-group">
                    <label className="auth-label">
                        Email Address
                    </label>
                    <input
                        type="email"
                        required
                        className="auth-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                    />
                </div>

                <div className="auth-form-group">
                    <label className="auth-label">
                        Password
                    </label>
                    <input
                        type="password"
                        required
                        className="auth-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            style={{ height: '1rem', width: '1rem', color: '#4f46e5', borderRadius: '0.25rem' }}
                        />
                        <label htmlFor="remember-me" style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                            Remember me
                        </label>
                    </div>

                    <div style={{ fontSize: '0.875rem' }}>
                        <Link to="/auth/forgot-password" style={{ fontWeight: '500', color: '#4f46e5', textDecoration: 'none' }}>
                            Forgot password?
                        </Link>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="auth-submit-btn"
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>
            </form>

            <div className="auth-footer">
                Don't have an account?{" "}
                <Link to="/auth/register" className="auth-link">
                    Create a free account
                </Link>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;
