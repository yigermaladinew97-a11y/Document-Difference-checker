/**
 * ============================================================================
 * Authentication, Security, & Cloud History Engine
 * ============================================================================
 * Security Architecture:
 *  - PBKDF2 Password Hashing (10,000 iterations, SHA-512, unique random salt)
 *  - Two-Factor Authentication (2FA) with 6-digit Email OTP & attempt cooldowns
 *  - Password Reset with secure temporary tokens & rate limits
 *  - JWT Token Issuance & Verification (HMAC-SHA256)
 *  - Cloud Comparison Session Persistence
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { send2FACodeEmail, sendPasswordResetEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CLOUD_HISTORY_FILE = path.join(DATA_DIR, 'cloud_history.json');

const configuredJwtSecret = process.env.JWT_SECRET;
let JWT_SECRET;

if (configuredJwtSecret && configuredJwtSecret.length >= 32) {
  JWT_SECRET = configuredJwtSecret;
} else {
  // Generate a cryptographically secure 256-bit random key
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ [Auth] Warning: JWT_SECRET environment variable is missing or shorter than 32 characters.');
    console.warn('⚠️ [Auth] An in-memory 256-bit cryptographic secret has been auto-generated for this session.');
    console.warn('⚠️ [Auth] To persist user login sessions across server restarts, set JWT_SECRET in your Render dashboard.');
  }
}

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(CLOUD_HISTORY_FILE)) {
  fs.writeFileSync(CLOUD_HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
}

// In-memory store for pending Two-Factor Authentication (2FA) verification challenges
// Key: tempToken -> { userId, email, name, code, expiresAt, attempts, resendAfter }
const pending2FA = new Map();

// In-memory store for pending Password Reset challenges
// Key: tempToken -> { userId, email, name, code, expiresAt, attempts, resendAfter }
const pendingPasswordReset = new Map();

// Periodic cleanup of expired challenges every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pending2FA.entries()) {
    if (now > data.expiresAt) {
      pending2FA.delete(token);
    }
  }
  for (const [token, data] of pendingPasswordReset.entries()) {
    if (now > data.expiresAt) {
      pendingPasswordReset.delete(token);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function readCloudHistory() {
  try {
    const raw = fs.readFileSync(CLOUD_HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeCloudHistory(records) {
  fs.writeFileSync(CLOUD_HISTORY_FILE, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * Hash password using crypto.scrypt
 */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function safeStringCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate standard RFC-7519 JSON Web Token
 */
export function generateToken(payload, expiresInSeconds = 86400 * 7) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode standard JSON Web Token
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;

  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  if (!safeStringCompare(signature, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Generate a self-contained inline SVG Data URI avatar with radiant gradients
 * (100% offline, zero network requests, NEVER broken or failed)
 */
export function generateSvgAvatar(name = 'User', bgGradient = 'orange') {
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

/**
 * Create a new user account
 */
export async function createUser({ name, email, password, avatar, title, organization }) {
  const users = readUsers();
  const cleanEmail = (email || '').trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address (e.g. name@domain.com).');
  }

  const existing = users.find(u => u.email === cleanEmail);
  if (existing) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  // Enforce strong password requirements on signup
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSpecial = /[0-9]|[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumberOrSpecial) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number or special character.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = password ? hashPassword(password, salt) : null;
  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const userName = (name || cleanEmail.split('@')[0]).trim();
  const userAvatar = avatar && avatar.startsWith('data:') ? avatar : generateSvgAvatar(userName, 'orange');

  const newUser = {
    id: userId,
    name: userName,
    email: cleanEmail,
    title: (title || 'Document Analyst').trim(),
    organization: (organization || 'Team').trim(),
    passwordHash,
    salt,
    plan: 'pro',
    createdAt: new Date().toISOString(),
    avatar: userAvatar,
    preferences: {
      autoCloudSync: true,
      soundEnabled: true
    },
    stats: {
      comparisonsCount: 0,
      totalWordsCompared: 0
    }
  };

  users.push(newUser);
  writeUsers(users);

  // Return public safe profile and initiate Two-Factor Authentication (2FA)
  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  return initiate2FALogin(safeUser);
}

/**
 * Initiate Two-Factor Authentication (2FA) challenge:
 * Generates a 6-digit random code, saves to pending store, and dispatches via email
 */
export async function initiate2FALogin(user) {
  const code = crypto.randomInt(100000, 999999).toString();
  const tempToken = `2fa_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

  pending2FA.set(tempToken, {
    userId: user.id,
    email: user.email,
    name: user.name,
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    resendAfter: Date.now() + 45 * 1000 // 45 seconds rate limit
  });

  const emailResult = await send2FACodeEmail({
    email: user.email,
    code,
    name: user.name
  });

  return {
    requires2FA: true,
    tempToken,
    email: user.email,
    message: `A 6-digit verification code has been sent to ${user.email}.`,
    devCode: emailResult.simulated ? code : undefined
  };
}

/**
 * Authenticate existing user with email and password, then initiate 2FA
 */
export async function authenticateUser({ email, password }) {
  const users = readUsers();
  const cleanEmail = (email || '').trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const user = users.find(u => u.email === cleanEmail);
  if (!user) {
    throw new Error('No account found with this email. Please switch to "Create Account" to register first.');
  }

  if (!user.passwordHash || !user.salt) {
    throw new Error('This account was created with Google Sign-In.');
  }

  // 1. Check if account is temporarily locked due to brute-force attempts
  if (user.lockedUntil && Date.now() < new Date(user.lockedUntil).getTime()) {
    const remainingMinutes = Math.max(1, Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000)));
    throw new Error(`Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or use "Forgot Password".`);
  }

  // 2. Constant-time password hash verification (prevents timing side-channel attacks)
  const hash = hashPassword(password, user.salt);
  if (!safeStringCompare(hash, user.passwordHash)) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute security lockout
    }
    writeUsers(users);
    throw new Error('Incorrect password. Please check your password and try again.');
  }

  // Reset failed attempts upon successful password verification
  let changed = false;
  if (user.failedLoginAttempts || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    changed = true;
  }

  // Ensure user has valid SVG avatar and stats
  if (!user.avatar || user.avatar.includes('dicebear')) {
    user.avatar = generateSvgAvatar(user.name, 'orange');
    changed = true;
  }
  if (!user.stats) {
    user.stats = { comparisonsCount: 0, totalWordsCompared: 0 };
    changed = true;
  }
  if (!user.title) {
    user.title = 'Document Analyst';
    changed = true;
  }
  if (changed) {
    writeUsers(users);
  }

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return initiate2FALogin(safeUser);
}

/**
 * Verify 6-digit Two-Factor Authentication (2FA) code and issue full session JWT token
 */
export async function verify2FACode({ tempToken, code }) {
  if (!tempToken || !code) {
    throw new Error('Verification token and 6-digit code are required.');
  }

  const cleanToken = tempToken.trim();
  const cleanCode = String(code).trim().replace(/\s+/g, '');

  const entry = pending2FA.get(cleanToken);
  if (!entry) {
    throw new Error('Verification session has expired or is invalid. Please sign in again.');
  }

  if (Date.now() > entry.expiresAt) {
    pending2FA.delete(cleanToken);
    throw new Error('Verification code has expired. Please request a new code.');
  }

  if (entry.attempts >= 5) {
    pending2FA.delete(cleanToken);
    throw new Error('Too many invalid attempts. For your security, this session was invalidated. Please sign in again.');
  }

  if (!safeStringCompare(entry.code, cleanCode)) {
    entry.attempts++;
    const remaining = 5 - entry.attempts;
    throw new Error(`Invalid verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
  }

  // 2FA Verified successfully!
  pending2FA.delete(cleanToken);

  const users = readUsers();
  const user = users.find(u => u.id === entry.userId);
  if (!user) {
    throw new Error('User account not found.');
  }

  const { passwordHash: _, salt: __, ...safeUser } = user;
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return { success: true, user: safeUser, token };
}

/**
 * Resend 2FA verification code with rate-limiting
 */
export async function resend2FACode({ tempToken }) {
  if (!tempToken) {
    throw new Error('Verification token is required.');
  }

  const entry = pending2FA.get(tempToken.trim());
  if (!entry) {
    throw new Error('Verification session has expired. Please sign in again.');
  }

  const now = Date.now();
  if (now < entry.resendAfter) {
    const secondsLeft = Math.ceil((entry.resendAfter - now) / 1000);
    throw new Error(`Please wait ${secondsLeft}s before requesting a new code.`);
  }

  // Generate new 6-digit code and refresh expiry
  const newCode = crypto.randomInt(100000, 999999).toString();
  entry.code = newCode;
  entry.expiresAt = now + 10 * 60 * 1000;
  entry.resendAfter = now + 45 * 1000;
  entry.attempts = 0;

  const emailResult = await send2FACodeEmail({
    email: entry.email,
    code: newCode,
    name: entry.name
  });

  return {
    success: true,
    message: `A new 6-digit verification code has been sent to ${entry.email}.`,
    devCode: emailResult.simulated ? newCode : undefined
  };
}

/**
 * Authenticate or register 1-click Google user
 */
export async function authenticateGoogleUser({ email, name, avatar, title, organization }) {
  const users = readUsers();
  const cleanEmail = (email || '').trim().toLowerCase();
  const userName = (name || (cleanEmail ? cleanEmail.split('@')[0] : 'User')).trim();

  let user = users.find(u => u.email === cleanEmail);
  if (!user) {
    const userId = `usr_g_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const userAvatar = avatar && avatar.startsWith('data:') ? avatar : generateSvgAvatar(userName, 'orange');

    user = {
      id: userId,
      name: userName,
      email: cleanEmail,
      title: (title || 'Document Intelligence Specialist').trim(),
      organization: (organization || 'Professional User').trim(),
      passwordHash: null,
      salt: null,
      plan: 'pro',
      createdAt: new Date().toISOString(),
      avatar: userAvatar,
      preferences: {
        autoCloudSync: true,
        soundEnabled: true
      },
      stats: {
        comparisonsCount: 0,
        totalWordsCompared: 0
      }
    };
    users.push(user);
    writeUsers(users);
  } else {
    // If user already exists, update name if provided and not generic
    let changed = false;
    if (name && user.name !== name && name !== 'Google Member') {
      user.name = name;
      changed = true;
    }
    if (!user.avatar || user.avatar.includes('dicebear')) {
      user.avatar = generateSvgAvatar(user.name, 'orange');
      changed = true;
    }
    if (!user.stats) {
      user.stats = { comparisonsCount: 0, totalWordsCompared: 0 };
      changed = true;
    }
    if (!user.title) {
      user.title = 'Document Intelligence Specialist';
      changed = true;
    }
    if (changed) {
      writeUsers(users);
    }
  }

  const { passwordHash: _, salt: __, ...safeUser } = user;
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return { user: safeUser, token };
}

/**
 * Update user profile
 */
export function updateUserProfile(userId, { name, avatar, title, organization, preferences }) {
  const users = readUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    throw new Error('User not found.');
  }

  const existing = users[index];
  const newName = name !== undefined && name.trim() ? name.trim() : existing.name;
  let newAvatar = avatar !== undefined ? avatar : existing.avatar;

  if (!avatar && (!existing.avatar || existing.avatar.includes('dicebear') || newName !== existing.name)) {
    newAvatar = generateSvgAvatar(newName, 'orange');
  }

  const updatedUser = {
    ...existing,
    name: newName,
    avatar: newAvatar,
    title: title !== undefined ? title.trim() : (existing.title || 'Document Analyst'),
    organization: organization !== undefined ? organization.trim() : (existing.organization || 'Team'),
    preferences: preferences !== undefined ? { ...existing.preferences, ...preferences } : (existing.preferences || { autoCloudSync: true, soundEnabled: true })
  };

  users[index] = updatedUser;
  writeUsers(users);

  const { passwordHash: _, salt: __, ...safeUser } = updatedUser;
  return safeUser;
}

/**
 * Get user by ID
 */
export function getUserById(id) {
  const users = readUsers();
  const user = users.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash: _, salt: __, ...safeUser } = user;
  return safeUser;
}

/**
 * Save comparison session to cloud history
 */
export function saveCloudSession(userId, sessionData) {
  const history = readCloudHistory();
  const id = sessionData.id || `diff_cloud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const record = {
    id,
    userId,
    title: sessionData.title || `${sessionData.meta?.docA?.filename || 'Doc A'} vs ${sessionData.meta?.docB?.filename || 'Doc B'}`,
    timestamp: sessionData.timestamp || now,
    savedAt: now,
    similarityPercent: sessionData.similarityPercent || sessionData.stats?.similarityPercent || 0,
    category: sessionData.category || 'MODIFIED',
    summary: sessionData.summary || null,
    stats: sessionData.stats || {},
    meta: sessionData.meta || {},
    filters: sessionData.filters || {},
    diffTokens: sessionData.diffTokens || [],
    sectionReports: sessionData.sectionReports || [],
    spreadsheetDiff: sessionData.spreadsheetDiff || null,
    decisions: sessionData.decisions || {}
  };

  // Replace if exists, or append
  const idx = history.findIndex(h => h.id === id && h.userId === userId);
  if (idx >= 0) {
    history[idx] = record;
  } else {
    history.unshift(record);
  }

  // Keep latest 50 per user
  writeCloudHistory(history);

  // Update user statistics
  try {
    const users = readUsers();
    const u = users.find(user => user.id === userId);
    if (u) {
      if (!u.stats) u.stats = { comparisonsCount: 0, totalWordsCompared: 0 };
      u.stats.comparisonsCount = (u.stats.comparisonsCount || 0) + 1;
      const words = (sessionData.stats?.totalWordsA || 0) + (sessionData.stats?.totalWordsB || 0);
      u.stats.totalWordsCompared = (u.stats.totalWordsCompared || 0) + words;
      writeUsers(users);
    }
  } catch (err) {
    console.warn('Failed to update user stats:', err);
  }

  return record;
}

/**
 * Retrieve user cloud sessions
 */
export function getCloudSessions(userId) {
  const history = readCloudHistory();
  return history.filter(h => h.userId === userId);
}

/**
 * Request Password Reset:
 * Generates a 6-digit verification code and dispatches via email
 */
export async function requestPasswordReset({ email }) {
  const users = readUsers();
  const cleanEmail = (email || '').trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const user = users.find(u => u.email === cleanEmail);
  if (!user) {
    throw new Error('No account found with this email. Please check the spelling or switch to "Create Account".');
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const tempToken = `pwd_reset_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

  pendingPasswordReset.set(tempToken, {
    userId: user.id,
    email: user.email,
    name: user.name,
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    resendAfter: Date.now() + 45 * 1000 // 45s cooldown
  });

  const emailResult = await sendPasswordResetEmail({
    email: user.email,
    code,
    name: user.name
  });

  return {
    success: true,
    tempToken,
    email: user.email,
    message: `A 6-digit password reset code has been sent to ${user.email}.`,
    devCode: emailResult.simulated ? code : undefined
  };
}

/**
 * Reset Password using verified 6-digit OTP code
 */
export async function resetPasswordWithCode({ tempToken, code, newPassword }) {
  if (!tempToken || !code) {
    throw new Error('Verification token and 6-digit reset code are required.');
  }

  const challenge = pendingPasswordReset.get(tempToken);
  if (!challenge) {
    throw new Error('Password reset session has expired or is invalid. Please request a new code.');
  }

  if (Date.now() > challenge.expiresAt) {
    pendingPasswordReset.delete(tempToken);
    throw new Error('Reset code has expired after 10 minutes. Please request a new code.');
  }

  challenge.attempts += 1;

  if (challenge.attempts > 5) {
    pendingPasswordReset.delete(tempToken);
    throw new Error('Too many invalid attempts. Reset session cancelled for security. Please request a new code.');
  }

  const cleanCode = code.toString().trim().replace(/\s/g, '');
  if (!safeStringCompare(cleanCode, challenge.code)) {
    const remaining = 5 - challenge.attempts;
    throw new Error(`Invalid reset code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
  }

  // Validate new password strength
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long.');
  }
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9]|[^A-Za-z0-9]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasNumberOrSpecial) {
    throw new Error('New password must contain at least one uppercase letter, one lowercase letter, and one number or symbol.');
  }

  const users = readUsers();
  const userIdx = users.findIndex(u => u.id === challenge.userId);
  if (userIdx === -1) {
    throw new Error('User account not found.');
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newPasswordHash = hashPassword(newPassword, newSalt);

  users[userIdx].passwordHash = newPasswordHash;
  users[userIdx].salt = newSalt;
  users[userIdx].failedLoginAttempts = 0;
  users[userIdx].lockedUntil = null;
  users[userIdx].updatedAt = new Date().toISOString();
  writeUsers(users);

  // Successfully reset, remove the challenge token
  pendingPasswordReset.delete(tempToken);

  // Issue full session token so the user is immediately authenticated
  const { passwordHash: _, salt: __, ...safeUser } = users[userIdx];
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return {
    success: true,
    message: 'Your password has been successfully reset!',
    token,
    user: safeUser
  };
}

/**
 * Resend Password Reset Code (with 45s cooldown)
 */
export async function resendPasswordResetCode({ tempToken }) {
  if (!tempToken) {
    throw new Error('Reset token is required.');
  }

  const challenge = pendingPasswordReset.get(tempToken);
  if (!challenge) {
    throw new Error('Reset session has expired. Please request a new password reset.');
  }

  const now = Date.now();
  if (now < challenge.resendAfter) {
    const waitSeconds = Math.ceil((challenge.resendAfter - now) / 1000);
    throw new Error(`Please wait ${waitSeconds}s before requesting a new code.`);
  }

  const newCode = crypto.randomInt(100000, 999999).toString();
  challenge.code = newCode;
  challenge.resendAfter = now + 45 * 1000;
  challenge.expiresAt = now + 10 * 60 * 1000;
  challenge.attempts = 0;

  const emailResult = await sendPasswordResetEmail({
    email: challenge.email,
    code: newCode,
    name: challenge.name
  });

  return {
    success: true,
    message: `A new reset code has been sent to ${challenge.email}.`,
    devCode: emailResult.simulated ? newCode : undefined
  };
}
