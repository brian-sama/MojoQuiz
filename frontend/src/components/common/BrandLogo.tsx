import React from 'react';

type BrandLogoVariant = 'full' | 'mark';

interface BrandLogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    variant?: BrandLogoVariant;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'full', alt, ...props }) => {
    const src = variant === 'mark' ? '/mojoquiz-mark.svg' : '/mojoquiz-logo.svg';
    const resolvedAlt = alt ?? (variant === 'mark' ? 'MojoQuiz icon' : 'MojoQuiz');

    return <img src={src} alt={resolvedAlt} {...props} />;
};

export default BrandLogo;
