/**
 * Skeleton — Generic pulse loader for enterprise UI
 * 
 * Usage:
 * <Skeleton variant="card" height={200} />
 * <Skeleton variant="text" width="60%" />
 */

import React from 'react';
import '../../layouts/AppLayout.css'; // Skeletons are defined here

interface SkeletonProps {
    variant?: 'text' | 'stat' | 'card' | 'circle' | 'rect';
    width?: string | number;
    height?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'rect',
    width,
    height,
    className = '',
    style
}) => {
    const skeletonClass = `skeleton skeleton-${variant} ${className}`;

    const inlineStyle: React.CSSProperties = {
        ...style,
        width: width ?? undefined,
        height: height ?? undefined,
    };

    return <div className={skeletonClass} style={inlineStyle} aria-hidden="true" />;
};

export default Skeleton;
