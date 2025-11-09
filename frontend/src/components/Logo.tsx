import { Link } from 'react-router-dom';
import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  // Tailles pour l'icône
  const iconSizes = {
    sm: 'h-8 w-8 sm:h-10 sm:w-10',
    md: 'h-12 w-12 sm:h-14 sm:w-14',
    lg: 'h-16 w-16 sm:h-20 sm:w-20'
  };

  // Tailles pour le texte principal "VOLLEYPRONO" - Style sportif et impactant
  const titleSizes = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl md:text-3xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl'
  };

  // Tailles pour le sous-titre "Pronostic volley" - Plus petit et discret
  const subtitleSizes = {
    sm: 'text-[10px] sm:text-xs',
    md: 'text-xs sm:text-sm',
    lg: 'text-sm sm:text-base'
  };

  // Tailles pour l'emoji de fallback
  const emojiSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  };

  return (
    <Link 
      to="/" 
      className={`flex items-center space-x-2 sm:space-x-3 group ${className}`}
    >
      {/* Icône sans cadre supplémentaire */}
      {!imageError ? (
        <img 
          src="/images/logo.png" 
          alt="VolleyProno Logo" 
          className={`${iconSizes[size]} object-contain transition-opacity group-hover:opacity-90`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`${iconSizes[size]} flex items-center justify-center`}>
          <span className={`font-sport text-orange-500 group-hover:text-orange-400 transition-colors ${emojiSizes[size]}`}>
            🏐
          </span>
        </div>
      )}

      {/* Texte à côté de l'icône - Style sportif et attirant pour parieurs */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span className={`font-sport text-white group-hover:text-orange-400 transition-colors ${titleSizes[size]} leading-tight tracking-wider drop-shadow-lg`}>
            VOLLEYPRONO
          </span>
          <span className={`font-bold-sport text-orange-500 group-hover:text-orange-400 transition-colors ${subtitleSizes[size]} leading-tight tracking-widest uppercase font-semibold`}>
            Pronostic volley
          </span>
        </div>
      )}
    </Link>
  );
}

