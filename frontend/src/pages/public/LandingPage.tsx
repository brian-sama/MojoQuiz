/**
 * LandingPage — SEO optimized public face
 * 
 * Replaces the JoinPage as the default route (/).
 * Maintains the participant join functionality while adding high-value marketing content.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import '../../layouts/AppLayout.css'; // Uses variables and utility classes

const LandingPage: React.FC = () => {
    const [joinCode, setJoinCode] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.trim()) {
            navigate(`/join/${joinCode.toUpperCase()}`);
        }
    };

    return (
        <div className="landing-page">
            <SEOHead />

            {/* Header / Nav */}
            <nav className="app-nav">
                <div className="app-nav-inner flex justify-between items-center">
                    <div className="text-xl font-bold text-primary">MojoQuiz</div>
                    <div className="flex gap-md">
                        <Link to="/auth/login" className="btn btn-secondary">Login</Link>
                        <Link to="/auth/register" className="btn btn-primary">Sign Up</Link>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="py-2xl px-md text-center bg-surface-hover">
                    <div className="max-w-xl mx-auto">
                        <h1 className="text-6xl font-black mb-md leading-tight">
                            Interactive Experiences <br />
                            <span className="text-primary">Built for Everyone.</span>
                        </h1>
                        <p className="text-xl text-muted mb-xl">
                            The all-in-one platform for live quizzes, polls, and word clouds.
                            Turn passive listeners into active participants.
                        </p>

                        <div className="card p-xl shadow-lg mx-auto max-w-sm">
                            <h1 className="text-xl-bold mb-md">MojoQuiz</h1>
                            <form onSubmit={handleJoin} className="flex gap-sm">
                                <input
                                    type="text"
                                    className="input text-center text-xl"
                                    placeholder="e.g. AB1234"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={8}
                                />
                                <button type="submit" className="btn btn-primary">Join</button>
                            </form>
                            <p className="text-xs text-muted mt-md">No account required to join a session.</p>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-2xl px-md">
                    <div className="max-w-xl grid grid-cols-2 gap-xl">
                        <div className="card p-lg border-primary">
                            <div className="text-3xl mb-sm">⚡</div>
                            <h3 className="text-xl font-bold mb-xs">Live Quizzes</h3>
                            <p className="text-secondary text-sm">Real-time competition with leaderboards and instant feedback.</p>
                        </div>
                        <div className="card p-lg">
                            <div className="text-3xl mb-sm">📊</div>
                            <h3 className="text-xl font-bold mb-xs">Audience Polling</h3>
                            <p className="text-secondary text-sm">Collect opinions and see results live with beautiful charts.</p>
                        </div>
                        <div className="card p-lg">
                            <div className="text-3xl mb-sm">☁️</div>
                            <h3 className="text-xl font-bold mb-xs">Word Clouds</h3>
                            <p className="text-secondary text-sm">Visualize thoughts and feelings with interactive word clouds.</p>
                        </div>
                        <div className="card p-lg">
                            <div className="text-3xl mb-sm">📈</div>
                            <h3 className="text-xl font-bold mb-xs">Enterprise Analytics</h3>
                            <p className="text-secondary text-sm">Deep insights into engagement and accuracy across your organization.</p>
                        </div>
                    </div>
                </section>

                {/* Social Proof */}
                <section className="py-xl text-center border-y bg-muted-50">
                    <div className="flex justify-center gap-xl items-center opacity-50 grayscale">
                        <span className="text-xl font-bold">Trusted by Presentation Professionals</span>
                    </div>
                </section>

                {/* CTA Footer */}
                <section className="py-2xl text-center">
                    <h2 className="text-3xl font-bold mb-md">Ready to engage your audience?</h2>
                    <div className="flex justify-center gap-md">
                        <Link to="/auth/register" className="btn btn-primary btn-large">Get Started for Free</Link>
                        <Link to="/auth/login" className="btn btn-secondary btn-large">Presenter Login</Link>
                    </div>
                </section>
            </main>

            <footer className="py-xl border-t bg-surface">
                <div className="max-w-xl mx-auto px-md flex justify-between items-center text-sm text-muted">
                    <div>© 2026 MojoQuiz. All rights reserved.</div>
                    <div className="flex gap-md">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                    </div>
                </div>
            </footer>

            <style>{`
                .landing-page { min-height: 100vh; display: flex; flex-direction: column; }
                .text-6xl { font-size: 3.5rem; }
                .font-black { font-weight: 900; }
                .max-w-xl { max-width: 1140px; margin-left: auto; margin-right: auto; }
            `}</style>
        </div>
    );
};

export default LandingPage;
