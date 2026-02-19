import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mentalHealthImg from '../../assets/mental_health.jpg';
import youthEngagementImg from '../../assets/youth_engagement.png';
import srhrImg from '../../assets/background_srhr.jpg';

const shapes = [
    { id: 1, size: 120, color: 'rgba(99, 102, 241, 0.12)', top: '15%', left: '15%' },
    { id: 2, size: 180, color: 'rgba(168, 85, 247, 0.12)', top: '65%', left: '75%' },
    { id: 3, size: 90, color: 'rgba(236, 72, 153, 0.12)', top: '25%', left: '85%' },
    { id: 4, size: 140, color: 'rgba(59, 130, 246, 0.12)', top: '75%', left: '15%' },
    { id: 5, size: 80, color: 'rgba(16, 185, 129, 0.12)', top: '45%', left: '5%' },
    { id: 6, size: 200, color: 'rgba(249, 115, 22, 0.08)', top: '5%', left: '60%' },
];

const themeImages = [
    { id: 'srhr', src: srhrImg },
    { id: 'mh', src: mentalHealthImg },
    { id: 'ye', src: youthEngagementImg },
];

const BouncingBackground = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % themeImages.length);
        }, 8000); // Slower cycling for more premium feel
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bouncing-background">
            {/* Animated organic shapes with staggered timing */}
            {shapes.map((shape, i) => (
                <motion.div
                    key={shape.id}
                    className="bouncing-shape"
                    style={{
                        width: shape.size,
                        height: shape.size,
                        backgroundColor: shape.color,
                        top: shape.top,
                        left: shape.left,
                        position: 'absolute',
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        zIndex: -1,
                    }}
                    animate={{
                        y: [0, -40 - i * 8, 0],
                        x: [0, 15 + i * 5, 0],
                        scale: [1, 1.15, 1],
                        rotate: [0, 15, -15, 0],
                    }}
                    transition={{
                        duration: 10 + i * 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.4,
                    }}
                />
            ))}

            {/* Premium cross-fading background images with Ken Burns effect */}
            <AnimatePresence>
                <motion.img
                    key={themeImages[currentIndex].id}
                    src={themeImages[currentIndex].src}
                    className="theme-background-image"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{
                        opacity: 0.3,
                        scale: 1,
                        transition: {
                            opacity: { duration: 2, ease: 'easeOut' },
                            scale: { duration: 8, ease: 'linear' },
                        },
                    }}
                    exit={{
                        opacity: 0,
                        scale: 0.98,
                        transition: { duration: 2, ease: 'easeIn' },
                    }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100vw',
                        height: '100vh',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                        zIndex: -2,
                        filter: 'blur(4px) saturate(120%) brightness(1.05)',
                    }}
                />
            </AnimatePresence>

            {/* Subtle gradient overlay for depth */}
            <div
                className="bg-gradient-overlay"
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 60%)',
                    pointerEvents: 'none',
                    zIndex: -1,
                }}
            />
        </div>
    );
};

export default BouncingBackground;
