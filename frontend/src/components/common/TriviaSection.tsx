import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../hooks/useApi';

const TriviaSection = () => {
    const [fact, setFact] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchFact = async () => {
        setLoading(true);
        try {
            const factData = await api.get('/facts/youth');
            setFact(factData.data.text);
        } catch (err) {
            console.error('Failed to fetch trivia:', err);
            setFact('Young people are the drivers of change! Stay engaged and keep participating.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFact();
    }, []);

    return (
        <div className="trivia-section">
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="trivia-loading"
                    >
                        Fetching a fun fact...
                    </motion.div>
                ) : (
                    <motion.div
                        key="fact"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        className="trivia-card"
                    >
                        <span className="trivia-label">Did you know?</span>
                        <p className="trivia-text">{fact}</p>
                        <button
                            onClick={fetchFact}
                            className="btn btn-secondary btn-small trivia-refresh"
                            title="Refresh fact"
                        >
                            Refresh
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TriviaSection;
