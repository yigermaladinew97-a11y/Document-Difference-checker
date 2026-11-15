/**
 * historyStorage.js
 * High-performance, zero-backend, browser-native IndexedDB engine for DocDiff comparison history.
 * Keeps user documents 100% private on-device with zero server storage costs or data-leak liabilities.
 */

const DB_NAME = 'DocDiffStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'comparisons';
const MAX_SESSIONS = 40; // Auto-prune older sessions to keep browser storage lean

/**
 * Open or initialize IndexedDB instance
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('similarityPercent', 'similarityPercent', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update a comparison session in IndexedDB
 * @param {Object} sessionData - Comparison result payload from server/client
 * @param {Object} [existingDecisions] - Optional accept/reject decisions map
 */
export async function saveComparisonSession(sessionData, existingDecisions = {}) {
  try {
    const db = await openDB();

    const id = sessionData.id || `diff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const docAName = sessionData.meta?.docA?.filename || 'Document A';
    const docBName = sessionData.meta?.docB?.filename || 'Document B';
    const title = `${docAName} vs ${docBName}`;

    const record = {
      id,
      title,
      timestamp: sessionData.timestamp || now,
      savedAt: now,
      similarityPercent: sessionData.similarityPercent || sessionData.stats?.similarityPercent || 0,
      category: sessionData.category || 'UNKNOWN',
      summary: sessionData.summary || null,
      stats: sessionData.stats || {},
      meta: sessionData.meta || {},
      filters: sessionData.filters || {},
      diffTokens: sessionData.diffTokens || [],
      sectionReports: sessionData.sectionReports || [],
      decisions: existingDecisions || sessionData.decisions || {}
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(record);

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    // Prune excess records older than MAX_SESSIONS
    pruneOldSessions(db).catch(() => {});

    return record;
  } catch (err) {
    console.error('Failed to save comparison to IndexedDB:', err);
    return null;
  }
}

/**
 * Update the user decisions on an existing session record
 */
export async function updateSessionDecisions(sessionId, decisions = {}) {
  if (!sessionId) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(sessionId);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.decisions = decisions;
          record.updatedAt = new Date().toISOString();
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('Failed to update decisions in IndexedDB:', err);
  }
}

/**
 * Retrieve all saved sessions, sorted newest first
 */
export async function getAllSessions() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = request.result || [];
        // Sort newest first by timestamp / savedAt
        sessions.sort((a, b) => new Date(b.timestamp || b.savedAt) - new Date(a.timestamp || a.savedAt));
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get sessions from IndexedDB:', err);
    return [];
  }
}

/**
 * Retrieve a specific session by ID
 */
export async function getSessionById(id) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to fetch session ${id}:`, err);
    return null;
  }
}

/**
 * Delete a single session by ID
 */
export async function deleteSession(id) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.error(`Failed to delete session ${id}:`, err);
    return false;
  }
}

/**
 * Clear all comparison history
 */
export async function clearAllSessions() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.error('Failed to clear sessions:', err);
    return false;
  }
}

/**
 * Export all history sessions as a downloadable JSON file
 */
export async function exportHistoryToJson() {
  const sessions = await getAllSessions();
  const backup = {
    app: 'DocDiff Studio',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    count: sessions.length,
    sessions
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DocDiff_History_Backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import and merge sessions from a JSON backup file
 */
export async function importHistoryFromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const sessions = Array.isArray(data.sessions) ? data.sessions : (Array.isArray(data) ? data : []);

    if (sessions.length === 0) {
      throw new Error('No valid comparison sessions found in JSON backup file.');
    }

    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      sessions.forEach(sess => {
        if (sess && sess.id) {
          store.put(sess);
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return sessions.length;
  } catch (err) {
    console.error('Failed to import sessions:', err);
    throw err;
  }
}

/**
 * Internal: Prune sessions beyond MAX_SESSIONS
 */
async function pruneOldSessions(db) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const getAllReq = store.getAll();

  getAllReq.onsuccess = () => {
    const sessions = getAllReq.result || [];
    if (sessions.length > MAX_SESSIONS) {
      // Sort oldest first
      sessions.sort((a, b) => new Date(a.timestamp || a.savedAt) - new Date(b.timestamp || b.savedAt));
      const toDelete = sessions.slice(0, sessions.length - MAX_SESSIONS);
      toDelete.forEach(s => store.delete(s.id));
    }
  };
}
