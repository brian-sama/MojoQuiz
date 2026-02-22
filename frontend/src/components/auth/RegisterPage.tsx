import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../hooks/useApi";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../layouts/AuthLayout";

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Redirect if already logged in
    React.useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate("/dashboard");
        }
    }, [isAuthenticated, authLoading, navigate]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post("auth/register", {
                email,
                password,
                displayName,
            });

            // Automatically log in after registration
            login(res.accessToken, res.user);
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return null;

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Start engaging your audience for free today."
        >
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

            <form onSubmit={handleRegister}>
                <div className="auth-form-group">
                    <label className="auth-label">
                        Full Name
                    </label>
                    <input
                        type="text"
                        required
                        className="auth-input"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>

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
                    <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                        Must be at least 8 characters long.
                    </p>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                        By creating an account, you agree to our{" "}
                        <Link to="/terms" style={{ color: '#4f46e5', textDecoration: 'none' }}>Terms of Service</Link> and{" "}
                        <Link to="/privacy" style={{ color: '#4f46e5', textDecoration: 'none' }}>Privacy Policy</Link>.
                    </p>
                    <button
                        type="submit"
                        disabled={loading}
                        className="auth-submit-btn"
                    >
                        {loading ? "Creating account..." : "Create Free Account"}
                    </button>
                </div>
            </form>

            <div className="auth-footer">
                Already have an account?{" "}
                <Link to="/auth/login" className="auth-link">
                    Sign in here
                </Link>
            </div>
        </AuthLayout>
    );
};

export default RegisterPage;
