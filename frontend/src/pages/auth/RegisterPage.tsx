import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../hooks/useApi';

const RegisterPage: React.FC = () => {
    const [step, setStep] = useState<1 | 2>(1); // 1: Email, 2: Verification + Password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/auth/register', { email });
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send verification code.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/verify-otp', {
                email,
                code,
                password,
                displayName
            });
            login(response.data.token, response.data.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to verify code and register.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="logo-text text-xl mb-sm">MojoQuiz</h1>
                    <p className="text-secondary">
                        {step === 1 ? 'Join the world-class engagement platform.' : 'Verify your email to continue.'}
                    </p>
                </div>

                {error && <div className="alert alert-error mb-md">{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleSendOTP}>
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
                            {loading ? 'Sending Code...' : 'Get Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyAndRegister}>
                        <div className="form-group mb-md text-center">
                            <p className="text-sm mb-xs">We sent a 6-digit code to</p>
                            <p className="font-bold mb-md">{email}</p>
                            <button
                                type="button"
                                className="link text-xs"
                                onClick={() => setStep(1)}
                            >
                                Change email
                            </button>
                        </div>

                        <div className="form-group mb-md">
                            <label className="form-label">Verification Code</label>
                            <input
                                type="text"
                                className="form-control text-center text-xl font-bold tracking-widest"
                                maxLength={6}
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group mb-md">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="John Doe"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group mb-lg">
                            <label className="form-label">Choose Password</label>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full py-md mb-md"
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Complete Sign Up'}
                        </button>
                    </form>
                )}

                <div className="auth-footer text-center mt-lg">
                    <p className="text-secondary text-sm">
                        Already have an account? <Link to="/login/auth" className="link font-bold">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
