/**
 * Main App Component
 * Routes between join page, participant view, and presenter dashboard
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './components/participant/JoinPage';
import PlayPage from './components/participant/PlayPage';
import PresenterDashboard from './components/presenter/Dashboard';
import HostSession from './components/presenter/HostSession';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Landing / Join page */}
                <Route path="/" element={<JoinPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/join/:code" element={<JoinPage />} />

                {/* Participant play page */}
                <Route path="/play/:code" element={<PlayPage />} />

                {/* Presenter dashboard */}
                <Route path="/host" element={<PresenterDashboard />} />
                <Route path="/host/:sessionId" element={<HostSession />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
