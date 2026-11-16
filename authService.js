import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CLOUD_HISTORY_FILE = path.join(DATA_DIR, 'cloud_history.json');

const JWT_SECRET = process.env.JWT_SECRET || 'docdiff_super_secret_signing_key_2026';

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

  if (signature !== expectedSig) return null;

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

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  if (password && password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const existing = users.find(u => u.email === cleanEmail);
  if (existing) {
    throw new Error('An account with this email address already exists. Please log in.');
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

  // Return public safe profile
  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return { user: safeUser, token };
}

/**
 * Authenticate existing user with email and password
 */
export async function authenticateUser({ email, password }) {
  const users = readUsers();
  const cleanEmail = (email || '').trim().toLowerCase();

  const user = users.find(u => u.email === cleanEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (!user.passwordHash || !user.salt) {
    throw new Error('This account was created with Google Sign-In. Please click "Continue with Google".');
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('Invalid email or password.');
  }

  // Ensure user has valid SVG avatar and stats
  let changed = false;
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
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return { user: safeUser, token };
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
