import React, { useState, useEffect } from 'react';

/**
 * UserAvatar:
 * 100% Bulletproof, high-resolution user avatar component.
 * Always renders radiant initials monogram as the rock-solid base layer.
 * If a custom profile photo (PP) or external image is provided, it fades in smoothly
 * only after successful image decode, with referrerPolicy="no-referrer".
 * NEVER shows broken image icons or browser placeholder boxes under any circumstance.
 */
export default function UserAvatar({
  user,
  name,
  avatar,
  size = 'md',
  className = '',
  ring = true
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const userName = user?.name || name || 'User';
  let userAvatar = user?.avatar || avatar;

  // Validate avatar string to filter corrupted data URIs
  if (typeof userAvatar === 'string') {
    userAvatar = userAvatar.trim();
    if (userAvatar.startsWith('data:image/svg+xml') && userAvatar.includes('/9j/')) {
      // Corrupted concatenated SVG+JPEG string
      userAvatar = null;
    }
  } else {
    userAvatar = null;
  }

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [userAvatar]);

  const parts = userName.trim().split(/\s+/).filter(Boolean);
  let initials = 'U';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 1) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-2xl font-black'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const ringClass = ring ? 'ring-2 ring-white dark:ring-slate-900 shadow-xs' : '';

  // Determine gradient palette from user preference or initials hash
  const gradients = [
    'from-[#FF5E1E] via-[#FF7A45] to-[#FFA07A]',
    'from-[#4F46E5] via-[#6366F1] to-[#818CF8]',
    'from-[#059669] via-[#10B981] to-[#34D399]',
    'from-[#0284C7] via-[#0EA5E9] to-[#38BDF8]',
    'from-[#7C3AED] via-[#9333EA] to-[#C084FC]',
    'from-[#D97706] via-[#F59E0B] to-[#FBBF24]'
  ];
  const charCode = (userName.charCodeAt(0) || 0) + (userName.charCodeAt(userName.length - 1) || 0);
  const gradientClass = gradients[charCode % gradients.length];

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold text-white bg-gradient-to-tr ${gradientClass} select-none ${selectedSize} ${ringClass} ${className}`}
      title={userName}
    >
      <span className="pointer-events-none select-none tracking-tight">{initials}</span>

      {userAvatar && !hasError && (
        <img
          src={userAvatar}
          alt={userName}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          loading="eager"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 select-none ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
