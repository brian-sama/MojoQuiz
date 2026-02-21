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
                <div className="mb-6 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
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
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                            Remember me
                        </label>
                    </div>

                    <div className="text-sm pb-0.5">
                        <Link to="/auth/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Forgot password?
                        </Link>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4"
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>
            </form>

            <div className="mt-8 text-sm text-center text-gray-600">
                Don't have an account?{" "}
                <Link to="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Create a free account
                </Link>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;
