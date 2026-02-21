/**
 * SEOHead — Unified meta tag management
 * 
 * Uses react-helmet-async to inject tags into <head>
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    ogImage?: string;
    noindex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({
    title = 'MojoQuiz — Interactive Audience Engagement Platform',
    description = 'Engage your audience with real-time quizzes, polls, and word clouds. Enterprise-grade engagement tools for presenters and teams.',
    canonicalUrl = 'https://mojoquiz.co.zw',
    ogImage = '/og-image.jpg',
    noindex = false,
}) => {
    const siteTitle = title.includes('MojoQuiz') ? title : `${title} | MojoQuiz`;

    return (
        <Helmet>
            <title>{siteTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow" />
            )}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={canonicalUrl} />
            <meta property="twitter:title" content={siteTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={ogImage} />
        </Helmet>
    );
};

export default SEOHead;
