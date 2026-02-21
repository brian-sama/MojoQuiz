import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../hooks/useApi";
import { useAuth } from "../../hooks/useAuth";

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome Back
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Sign in to continue to MojoQuiz
                    </p>
                </div>

                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-sm text-center text-gray-500">
                    <a
                        href="/auth/forgot-password"
                        className="text-indigo-600 hover:underline"
                    >
                        Forgot password?
                    </a>
                </div>

                <div className="mt-4 text-sm text-center text-gray-500">
                    Don't have an account?{" "}
                    <a
                        href="/auth/register"
                        className="text-indigo-600 hover:underline"
                    >
                        Create one
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
