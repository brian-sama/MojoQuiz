import React from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left Panel - Branding/Marketing (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-900 items-center justify-center overflow-hidden">
                {/* Subtle decorative background gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-indigo-600 to-indigo-900 opacity-90" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500 opacity-20 blur-3xl" />
                <div className="absolute top-32 -right-32 w-96 h-96 rounded-full bg-pink-500 opacity-20 blur-3xl" />

                <div className="relative z-10 px-12 text-white max-w-xl">
                    <Link to="/" className="inline-block mb-12">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
                                <span className="text-indigo-600 font-bold text-xl">M</span>
                            </div>
                            <span className="text-2xl font-bold tracking-tight">MojoQuiz</span>
                        </div>
                    </Link>

                    <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                        Engage your audience like never before.
                    </h1>
                    <p className="text-xl text-indigo-100 mb-12 leading-relaxed">
                        Create interactive presentations, live polls, and real-time Q&A sessions that turn passive listeners into active participants.
                    </p>

                    <div className="flex items-center space-x-4">
                        <div className="flex -space-x-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-300 border-2 border-indigo-900"></div>
                            <div className="w-10 h-10 rounded-full bg-indigo-400 border-2 border-indigo-900"></div>
                            <div className="w-10 h-10 rounded-full bg-indigo-200 border-2 border-indigo-900"></div>
                        </div>
                        <p className="text-sm font-medium text-indigo-200">
                            Trusted by innovative teams worldwide
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form Container */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-xl">M</span>
                        </div>
                        <span className="text-3xl font-bold text-gray-900 tracking-tight">MojoQuiz</span>
                    </div>

                    <div className="mb-8 pl-1">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h2>
                        {subtitle && <p className="text-gray-500 mt-2 text-sm">{subtitle}</p>}
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
