import React, { useState } from 'react';

/**
 * UserAvatar:
 * Bulletproof, high-resolution user avatar component.
 * Automatically falls back to radiant initials monograms if an image URL fails,
 * ensuring it NEVER displays broken image icons.
 */
export default function UserAvatar({
  user,
  name,
  avatar,
  size = 'md',
  className = '',
  ring = true
}) {
  const [hasError, setHasError] = useState(false);

  const userName = user?.name || name || 'User';
  const userAvatar = user?.avatar || avatar;

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

  // If we have an avatar and it hasn't errored
  if (userAvatar && !hasError) {
    return (
      <div className={`relative shrink-0 rounded-full overflow-hidden ${selectedSize} ${ringClass} ${className}`}>
        <img
          src={userAvatar}
          alt={userName}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover select-none"
          loading="eager"
        />
      </div>
    );
  }

  // Fallback to vibrant orange gradient monogram
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-tr from-[#FF5E1E] via-[#FF7A45] to-[#FFA07A] select-none ${selectedSize} ${ringClass} ${className}`}
      title={userName}
    >
      <span>{initials}</span>
    </div>
  );
}
