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
                <div className="mb-6 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 transition-shadow"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address
                    </label>
                    <input
                        type="email"
                        required
                        className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 transition-shadow"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Password
                    </label>
                    <input
                        type="password"
                        required
                        className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 transition-shadow"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        Must be at least 8 characters long.
                    </p>
                </div>

                <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-4">
                        By creating an account, you agree to our{" "}
                        <Link to="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link> and{" "}
                        <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
                    </p>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        {loading ? "Creating account..." : "Create Free Account"}
                    </button>
                </div>
            </form>

            <div className="mt-8 text-sm text-center text-gray-600">
                Already have an account?{" "}
                <Link to="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Sign in here
                </Link>
            </div>
        </AuthLayout>
    );
};

export default RegisterPage;
