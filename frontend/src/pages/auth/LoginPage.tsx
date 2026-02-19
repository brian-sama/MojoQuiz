import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../hooks/useApi';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import BouncingBackground from '../../components/common/BouncingBackground';
import { useEffect } from 'react';

type AuthStep = 'email' | 'login' | 'verify' | 'setup';

const LoginPage: React.FC = () => {
    const [step, setStep] = useState<AuthStep>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    // Check for social login redirect codes
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && !loading) {
            handleLinkedInCallback(code);
        }
    }, []);

    const handleLinkedInCallback = async (code: string) => {
        setLoading(true);
        setError('');
        try {
            const redirectUri = window.location.origin + window.location.pathname;
            const response = await api.post('/auth/linkedin', { code, redirectUri });
            login(response.data.token, response.data.user);
            navigate('/host');
        } catch (err: any) {
            setError(err.response?.data?.error || 'LinkedIn Authentication failed.');
        } finally {
            setLoading(false);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleLinkedInSignIn = () => {
        const clientId = '770hlec9zgu9mu';
        const redirectUri = window.location.origin + window.location.pathname;
        const scope = 'openid profile email';
        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
        window.location.href = authUrl;
    };

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
                setMessage(`Verification code sent to ${email}`);
                setStep('verify');
            } catch (err: any) {
                if (err.response?.data?.error === 'User already exists') {
                    setStep('login');
                } else {
                    throw err;
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
            login(response.data.token, response.data.user);
            navigate('/host');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 (New): Verify OTP
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (otpCode.length !== 6) {
            setError('Please enter a 6-digit code.');
            return;
        }
        setStep('setup');
    };

    // Step 3 (New): Setup Profile
    const handleCompleteRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/verify-otp', {
                email,
                code: otpCode,
                password,
                displayName
            });
            login(response.data.token, response.data.user);
            navigate('/host');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to complete registration.');
        } finally {
            setLoading(false);
        }
    };

    // Google Auth Handler
    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/google', {
                credential: credentialResponse.credential
            });
            login(response.data.token, response.data.user);
            navigate('/host');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Google Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setStep('email');
        setError('');
        setMessage('');
        setPassword('');
        setOtpCode('');
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
                                {loading ? 'Processing...' : 'Continue'}
                            </button>

                            <div className="social-divider">
                                <span>Or continue with</span>
                            </div>

                            <div className="social-icons-row">
                                <div className="google-login-wrapper">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => setError('Google Login Failed')}
                                        useOneTap
                                        type="icon"
                                        shape="circle"
                                        theme="filled_blue"
                                        size="large"
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="social-icon-btn"
                                    title="Sign up with LinkedIn"
                                    onClick={handleLinkedInSignIn}
                                    disabled={loading}
                                >
                                    <svg viewBox="0 0 24 24" fill="#0077b5">
                                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                    </svg>
                                </button>
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
                            <div className="mb-md text-center">
                                <span className="text-secondary font-bold">{email}</span>
                                <button type="button" onClick={resetFlow} className="link ml-sm text-sm">Change</button>
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

                    {step === 'verify' && (
                        <motion.form
                            key="verify-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleVerify}
                            className="form-step-container"
                        >
                            <p className="text-sm text-center mb-lg">
                                We sent a 6-digit code to <br />
                                <strong className="text-primary">{email}</strong>
                            </p>

                            <div className="form-group-premium">
                                <input
                                    id="otp-code"
                                    type="text"
                                    className="form-input-premium text-center tracking-widest font-bold"
                                    placeholder=" "
                                    title="Enter 6-digit verification code"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <label htmlFor="otp-code" className="form-label-premium">6-Digit Code</label>
                            </div>

                            <button
                                type="submit"
                                className="btn-premium"
                                disabled={otpCode.length !== 6}
                            >
                                Continue
                            </button>

                            <button type="button" onClick={resetFlow} className="btn-secondary w-full py-xs mt-md text-xs">
                                Did not get a code?
                            </button>
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
