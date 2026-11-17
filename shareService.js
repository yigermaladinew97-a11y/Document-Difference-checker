import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directory for shared comparisons
const SHARES_DIR = path.join(__dirname, 'data', 'shares');

// Ensure directory exists
if (!fs.existsSync(SHARES_DIR)) {
  fs.mkdirSync(SHARES_DIR, { recursive: true });
}

// 7 days in milliseconds
const EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a clean, URL-safe 8-character ID
 */
function generateShareId() {
  return crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').substring(0, 8);
}

/**
 * Save a comparison report for public sharing
 */
export function createShareReport(comparisonData, options = {}) {
  if (!comparisonData) {
    throw new Error('Comparison data payload is required to create a shareable report.');
  }

  const shareId = generateShareId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRATION_MS);

  const record = {
    shareId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdBy: options.userId || 'anonymous',
    title: options.title || `${comparisonData.meta?.docA?.filename || 'DocA'} vs ${comparisonData.meta?.docB?.filename || 'DocB'}`,
    comparisonData
  };

  const filePath = path.join(SHARES_DIR, `${shareId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');

  return {
    shareId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    title: record.title
  };
}

/**
 * Retrieve a shared comparison report by ID
 */
export function getShareReport(shareId) {
  if (!shareId || typeof shareId !== 'string') return null;

  // Sanitize shareId to alphanumeric only
  const sanitized = shareId.replace(/[^a-zA-Z0-9]/g, '');
  if (!sanitized) return null;

  const filePath = path.join(SHARES_DIR, `${sanitized}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const record = JSON.parse(raw);

    // Check expiration
    if (new Date(record.expiresAt) < new Date()) {
      // Clean up expired file
      try { fs.unlinkSync(filePath); } catch (e) {}
      return null;
    }

    return record;
  } catch (err) {
    console.error(`[Share Service] Error reading share ${shareId}:`, err);
    return null;
  }
}

/**
 * Clean up expired share files periodically
 */
export function cleanupExpiredShares() {
  try {
    const files = fs.readdirSync(SHARES_DIR);
    const now = new Date();
    let cleaned = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(SHARES_DIR, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const record = JSON.parse(raw);
        if (new Date(record.expiresAt) < now) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (e) {
        // Corrupted file, delete
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }

    if (cleaned > 0) {
      console.log(`[Share Service] Cleaned up ${cleaned} expired shared reports.`);
    }
  } catch (err) {
    console.warn('[Share Service] Periodic cleanup error:', err.message);
  }
}

// Run cleanup every 24 hours
setInterval(cleanupExpiredShares, 24 * 60 * 60 * 1000);
