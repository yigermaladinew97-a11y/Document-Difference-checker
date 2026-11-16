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
 * Create a new user account
 */
export async function createUser({ name, email, password, avatar }) {
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
  const userAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;

  const newUser = {
    id: userId,
    name: userName,
    email: cleanEmail,
    passwordHash,
    salt,
    plan: 'pro',
    createdAt: new Date().toISOString(),
    avatar: userAvatar
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

  const { passwordHash: _, salt: __, ...safeUser } = user;
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return { user: safeUser, token };
}

/**
 * Authenticate or register 1-click Google user
 */
export async function authenticateGoogleUser({ email, name, avatar }) {
  const users = readUsers();
  const cleanEmail = (email || '').trim().toLowerCase();

  let user = users.find(u => u.email === cleanEmail);
  if (!user) {
    const userId = `usr_g_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    user = {
      id: userId,
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      passwordHash: null,
      salt: null,
      plan: 'pro',
      createdAt: new Date().toISOString(),
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || cleanEmail)}`
    };
    users.push(user);
    writeUsers(users);
  }

  const { passwordHash: _, salt: __, ...safeUser } = user;
  const token = generateToken({ userId: safeUser.id, email: safeUser.email });

  return { user: safeUser, token };
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
  return record;
}

/**
 * Retrieve user cloud sessions
 */
export function getCloudSessions(userId) {
  const history = readCloudHistory();
  return history.filter(h => h.userId === userId);
}
