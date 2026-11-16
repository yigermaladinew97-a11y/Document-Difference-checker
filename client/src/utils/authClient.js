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

  setAuthSession(data.token, data.user);
  return data.user;
}

export async function signupWithEmail(name, email, password) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create account.');
  }

  setAuthSession(data.token, data.user);
  return data.user;
}

export async function loginWithGoogle(demoData = {}) {
  const payload = {
    email: demoData.email || 'demo.user@gmail.com',
    name: demoData.name || 'Demo Google User',
    avatar: demoData.avatar || 'https://lh3.googleusercontent.com/a/ACg8ocISample'
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
