import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../hooks/useApi';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to process request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="logo-text text-xl mb-sm">MojoQuiz</h1>
                    <p className="text-secondary">Reset your password</p>
                </div>

                {error && <div className="alert alert-error mb-md">{error}</div>}

                {!submitted ? (
                    <form onSubmit={handleSubmit}>
                        <p className="text-sm mb-lg text-secondary">
                            Enter your email address and we'll send you a code to reset your password.
                        </p>

                        <div className="form-group mb-lg">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-control"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full py-md mb-md"
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Reset Code'}
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="alert alert-success mb-lg">
                            If an account exists for {email}, a reset code has been sent.
                        </div>
                        <p className="text-sm mb-lg">
                            Please check your inbox and use the code to reset your password.
                        </p>
                        <Link to="/reset-password/auth" className="btn btn-primary w-full py-md mb-md">
                            Continue to Reset
                        </Link>
                    </div>
                )}

                <div className="auth-footer text-center mt-lg">
                    <Link to="/login/auth" className="link text-sm">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
