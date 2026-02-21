import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import BouncingBackground from '../../components/common/BouncingBackground';

type AuthStep = 'email' | 'login' | 'verify' | 'setup';

const LoginPage: React.FC = () => {
    const [step, setStep] = useState<AuthStep>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();


    // Step 1: Check if email exists
    const handleEmailContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            // We'll use a check-email endpoint if it exists, or just attempt register
            // For now, let's try to register. If user exists, it should error with "User already exists"
            // or we can catch that specific error to redirect to login.
            try {
                await api.post('/auth/register', { email });
                setStep('setup');
            } catch (err: any) {
                if (err.message === 'User already exists') {
                    setStep('login');
                } else {
                    throw err;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 (Existing): Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.token, response.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Invalid password. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    // Step 3 (New): Setup Profile
    const handleCompleteRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                email,
                password,
                displayName
            });
            login(response.token, response.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to complete registration.');
        } finally {
            setLoading(false);
        }
    };


    const resetFlow = () => {
        setStep('email');
        setError('');
        setMessage('');
        setPassword('');
    };

    return (
        <div className="auth-container">
            <BouncingBackground />

            <motion.div
                className="auth-card"
                layout
                transition={{ duration: 0.4, ease: "anticipate" }}
            >
                <div className="auth-header text-center">
                    <h1 className="logo-text">MojoQuiz</h1>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {step === 'email' && "Sign in or create an account"}
                            {step === 'login' && `Welcome back!`}
                            {step === 'verify' && "Verify your email"}
                            {step === 'setup' && "Complete your profile"}
                        </motion.p>
                    </AnimatePresence>
                </div>

                {error && <div className="alert-premium alert-error-premium">{error}</div>}
                {message && <div className="alert-premium alert-success-premium">{message}</div>}

                <AnimatePresence mode="wait">
                    {step === 'email' && (
                        <motion.form
                            key="email-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleEmailContinue}
                            className="form-step-container"
                        >
                            <div className="form-group-premium">
                                <input
                                    id="email"
                                    type="email"
                                    className="form-input-premium"
                                    placeholder=" "
                                    title="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <label htmlFor="email" className="form-label-premium">Email Address</label>
                            </div>

                            <button
                                type="submit"
                                className="btn-premium"
                                disabled={loading || !email}
                            >
                                {loading ? 'Continue' : 'Continue'}
                            </button>

                            <div className="text-center mt-lg">
                                <p className="text-sm text-secondary">
                                    Don't have an account? <Link to="/register/auth" className="link font-bold">Sign up</Link>
                                </p>
                            </div>

                        </motion.form>
                    )}

                    {step === 'login' && (
                        <motion.form
                            key="login-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleLogin}
                            className="form-step-container"
                        >
                            <div className="mb-mg flex items-center justify-center gap-sm">
                                <span className="text-secondary font-medium opacity-80">{email}</span>
                                <button
                                    type="button"
                                    onClick={resetFlow}
                                    className="btn-change-email"
                                >
                                    Change
                                </button>
                            </div>

                            <div className="form-group-premium">
                                <input
                                    id="login-password"
                                    type="password"
                                    className="form-input-premium"
                                    placeholder=" "
                                    title="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <label htmlFor="login-password" className="form-label-premium">Password</label>
                            </div>

                            <button
                                type="submit"
                                className="btn-premium"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="text-center mt-lg">
                                <Link to="/forgot-password/auth" className="link text-sm">Forgot password?</Link>
                            </div>
                        </motion.form>
                    )}


                    {step === 'setup' && (
                        <motion.form
                            key="setup-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleCompleteRegistration}
                            className="form-step-container"
                        >
                            <div className="form-group-premium">
                                <input
                                    id="full-name"
                                    type="text"
                                    className="form-input-premium"
                                    placeholder=" "
                                    title="Enter your full name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <label htmlFor="full-name" className="form-label-premium">Full Name</label>
                            </div>

                            <div className="form-group-premium">
                                <input
                                    id="setup-password"
                                    type="password"
                                    className="form-input-premium"
                                    placeholder=" "
                                    title="Create a secure password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <label htmlFor="setup-password" className="form-label-premium">Create Password</label>
                            </div>

                            <button
                                type="submit"
                                className="btn-premium"
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="auth-footer text-center mt-xl">
                    <p className="text-secondary text-xs opacity-60">
                        By proceeding, you agree to MojoQuiz's terms and privacy policy.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
