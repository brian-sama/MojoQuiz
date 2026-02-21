import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { AuthProvider } from './hooks/useAuth';
import { HelmetProvider } from 'react-helmet-async';

// Debug logging for production troubleshooting
if (import.meta.env.PROD) {
    console.log('MojoQuiz started');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HelmetProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </HelmetProvider>
    </React.StrictMode>
);
