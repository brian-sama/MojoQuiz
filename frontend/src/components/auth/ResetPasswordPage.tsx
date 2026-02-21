import React from 'react';
import { Link } from 'react-router-dom';

const ResetPasswordPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dark text-white p-4">
            <h1 className="text-4xl font-bold mb-8 text-primary">Reset Password</h1>
            <div className="w-full max-w-md bg-dark-lighter p-8 rounded-xl shadow-2xl space-y-4">
                <p className="text-gray-400 text-center">Please use the reset link sent to your email.</p>
                <div className="pt-4 border-t border-gray-700">
                    <Link to="/auth/login" className="text-primary hover:underline block text-center">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
