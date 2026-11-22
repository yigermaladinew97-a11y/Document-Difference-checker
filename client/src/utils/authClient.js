/**
 * authClient.js
 * Client-side authentication & Cloud Sync manager.
 * Stores JWT tokens securely in localStorage and handles authentication lifecycle.
 */

const TOKEN_KEY = 'docdiff_auth_token';
const USER_KEY = 'docdiff_user_profile';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setAuthSession(token, user) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginWithEmail(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to log in.');
  }

  // Two-Factor Authentication required
  if (data.requires2FA) {
    return data;
  }

  setAuthSession(data.token, data.user);
  return data.user;
}

export async function signupWithEmail(name, email, password, avatar = null) {
  const finalAvatar = avatar || generateLocalSvgAvatar(name, 'orange');
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, avatar: finalAvatar })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create account.');
  }

  // Two-Factor Authentication required to verify new account
  if (data.requires2FA) {
    return data;
  }

  setAuthSession(data.token, data.user);
  return data.user;
}

export async function verify2FACode(tempToken, code) {
  const res = await fetch('/api/auth/verify-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, code })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Verification failed.');
  }

  setAuthSession(data.token, data.user);
  return data.user;
}

export async function resend2FACode(tempToken) {
  const res = await fetch('/api/auth/resend-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to resend code.');
  }

  return data;
}

export async function requestPasswordReset(email) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to request password reset.');
  }

  return data;
}

export async function resetPasswordWithCode(tempToken, code, newPassword) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, code, newPassword })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to reset password.');
  }

  if (data.token && data.user) {
    setAuthSession(data.token, data.user);
  }

  return data;
}

export async function resendPasswordResetCode(tempToken) {
  const res = await fetch('/api/auth/resend-reset-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to resend code.');
  }

  return data;
}

export async function loginWithGoogle(demoData = {}) {
  const payloadName = (demoData.name || 'Yigermal Adinew').trim();
  const payloadEmail = (demoData.email || 'yigermal.adinew@gmail.com').trim().toLowerCase();
  const payloadAvatar = demoData.avatar || generateLocalSvgAvatar(payloadName, 'orange');

  const payload = {
    email: payloadEmail,
    name: payloadName,
    avatar: payloadAvatar
  };

  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Google authentication failed.');
  }

  setAuthSession(data.token, data.user);
  return data.user;
}

export async function syncCloudSession(sessionData) {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/user/cloud-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(sessionData)
    });

    const data = await res.json();
    return data.record || null;
  } catch (err) {
    console.warn('Failed to sync session to cloud:', err);
    return null;
  }
}

export async function getCloudSessions() {
  const token = getAuthToken();
  if (!token) return [];

  try {
    const res = await fetch('/api/user/cloud-history', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    return data.records || [];
  } catch (err) {
    console.warn('Failed to fetch cloud sessions:', err);
    return [];
  }
}

export function generateLocalSvgAvatar(name = 'User', bgGradient = 'orange') {
  const cleanName = (name || 'User').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = 'U';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 1) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  const gradients = {
    orange: { start: '#FF5E1E', end: '#FF8A50' },
    indigo: { start: '#4F46E5', end: '#7C3AED' },
    emerald: { start: '#059669', end: '#10B981' },
    cyan: { start: '#0284C7', end: '#06B6D4' },
    violet: { start: '#7C3AED', end: '#DB2777' },
    amber: { start: '#D97706', end: '#F59E0B' }
  };

  const g = gradients[bgGradient] || gradients.orange;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g_${bgGradient}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${g.start}" />
        <stop offset="100%" stop-color="${g.end}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#g_${bgGradient})" />
    <text x="50" y="55" fill="#ffffff" font-size="36" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function updateUserProfile(profileData) {
  const token = getAuthToken();
  if (!token) throw new Error('You must be signed in to update your profile.');

  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update profile.');
  }

  setAuthSession(token, data.user);
  return data.user;
}

export async function fetchCurrentProfile() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setAuthSession(token, data.user);
      return data.user;
    }
    return null;
  } catch (err) {
    return getCurrentUser();
  }
}
