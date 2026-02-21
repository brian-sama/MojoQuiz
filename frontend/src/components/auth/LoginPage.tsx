import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dark text-white p-4">
            <h1 className="text-4xl font-bold mb-8 text-primary">Login</h1>
            <div className="w-full max-w-md bg-dark-lighter p-8 rounded-xl shadow-2xl space-y-4">
                <p className="text-gray-400 text-center">Auth pages are currently under development.</p>
                <div className="pt-4 border-t border-gray-700">
                    <Link to="/auth/register" className="text-primary hover:underline block text-center">Don't have an account? Register</Link>
                    <Link to="/auth/forgot-password" className="text-gray-400 hover:text-white block text-center mt-2 text-sm">Forgot password?</Link>
                    <Link to="/" className="text-gray-400 hover:text-white block text-center mt-4 text-sm">Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
