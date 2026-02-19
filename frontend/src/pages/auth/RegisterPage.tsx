import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import BouncingBackground from '../../components/common/BouncingBackground';

const RegisterPage: React.FC = () => {
    // Single step registration
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleRegister = async (e: React.FormEvent) => {
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
            navigate('/host');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            <BouncingBackground />

            <div className="auth-container-premium">
                <motion.div
                    className="auth-card-premium"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="auth-header-premium">
                        <h1 className="logo-title">MojoQuiz</h1>
                        <p className="auth-subtitle">
                            Create your free account
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="error-banner mb-lg"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleRegister} className="form-step-container">
                        <div className="form-group-premium">
                            <input
                                id="reg-name"
                                type="text"
                                className="form-input-premium"
                                placeholder=" "
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                autoFocus
                            />
                            <label htmlFor="reg-name" className="form-label-premium">Full Name</label>
                        </div>

                        <div className="form-group-premium">
                            <input
                                id="reg-email"
                                type="email"
                                className="form-input-premium"
                                placeholder=" "
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <label htmlFor="reg-email" className="form-label-premium">Email Address</label>
                        </div>

                        <div className="form-group-premium">
                            <input
                                id="reg-pass"
                                type="password"
                                className="form-input-premium"
                                placeholder=" "
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <label htmlFor="reg-pass" className="form-label-premium">Choose Password</label>
                        </div>

                        <button
                            type="submit"
                            className="btn-premium"
                            disabled={loading}
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="text-center mt-xl">
                        <p className="text-secondary text-sm">
                            Already have an account? <Link to="/login/auth" className="link font-bold">Sign in</Link>
                        </p>
                    </div>

                    <div className="mt-xl pt-lg border-t border-white/10 text-center">
                        <p className="text-xs text-secondary opacity-60">
                            By signing up, you agree to our Terms and Privacy Policy.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RegisterPage;
