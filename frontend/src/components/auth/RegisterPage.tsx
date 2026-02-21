import React from 'react';
import { Link } from 'react-router-dom';

const RegisterPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dark text-white p-4">
            <h1 className="text-4xl font-bold mb-8 text-primary">Register</h1>
            <div className="w-full max-w-md bg-dark-lighter p-8 rounded-xl shadow-2xl space-y-4">
                <p className="text-gray-400 text-center">Registration is coming soon.</p>
                <div className="pt-4 border-t border-gray-700">
                    <Link to="/auth/login" className="text-primary hover:underline block text-center">Already have an account? Login</Link>
                    <Link to="/" className="text-gray-400 hover:text-white block text-center mt-4 text-sm">Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
