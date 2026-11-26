/**
 * test-history.js
 * Comprehensive automated verification for historyStorage.js & IndexedDB session persistence.
 */

// In-memory mock of IndexedDB for Node.js test environment
class MockObjectStore {
  constructor(dataMap) {
    this.dataMap = dataMap;
  }
  put(item) {
    const req = { onsuccess: null, onerror: null };
    setTimeout(() => {
      this.dataMap.set(item.id, JSON.parse(JSON.stringify(item)));
      if (req.onsuccess) req.onsuccess({ target: { result: item.id } });
    }, 5);
    return req;
  }
  get(id) {
    const req = { onsuccess: null, onerror: null, result: null };
    setTimeout(() => {
      req.result = this.dataMap.has(id) ? JSON.parse(JSON.stringify(this.dataMap.get(id))) : null;
      if (req.onsuccess) req.onsuccess();
    }, 5);
    return req;
  }
  getAll() {
    const req = { onsuccess: null, onerror: null, result: null };
    setTimeout(() => {
      req.result = Array.from(this.dataMap.values()).map(v => JSON.parse(JSON.stringify(v)));
      if (req.onsuccess) req.onsuccess();
    }, 5);
    return req;
  }
  delete(id) {
    const req = { onsuccess: null, onerror: null };
    setTimeout(() => {
      this.dataMap.delete(id);
      if (req.onsuccess) req.onsuccess();
    }, 5);
    return req;
  }
  clear() {
    const req = { onsuccess: null, onerror: null };
    setTimeout(() => {
      this.dataMap.clear();
      if (req.onsuccess) req.onsuccess();
    }, 5);
    return req;
  }
  createIndex() {}
}

const inMemoryStore = new Map();

class MockDatabase {
  constructor() {
    this.objectStoreNames = { contains: () => true };
  }
  transaction() {
    const tx = {
      oncomplete: null,
      onerror: null,
      objectStore: () => new MockObjectStore(inMemoryStore)
    };
    setTimeout(() => {
      if (tx.oncomplete) tx.oncomplete();
    }, 15);
    return tx;
  }
  createObjectStore() {
    return new MockObjectStore(inMemoryStore);
  }
}

global.window = {
  indexedDB: {
    open: (name, ver) => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: new MockDatabase() };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 5);
      return req;
    }
  }
};

// Now import the actual historyStorage module
async function runTests() {
  console.log('--- Testing Comparison History & Session Persistence (Step 5) ---\n');

  const {
    saveComparisonSession,
    getAllSessions,
    getSessionById,
    updateSessionDecisions,
    deleteSession,
    clearAllSessions,
    importHistoryFromJson
  } = await import('./client/src/utils/historyStorage.js');

  // Test 1: Save comparison session
  console.log('[Test 1/5] Saving a comparison session to IndexedDB...');
  const mockComparison = {
    id: 'test_session_101',
    meta: {
      docA: { filename: 'Employment_Agreement_2025.docx', format: 'docx', wordCount: 1200 },
      docB: { filename: 'Employment_Agreement_2026.docx', format: 'docx', wordCount: 1350 }
    },
    similarityPercent: 88.5,
    category: 'MODERATE_CHANGES',
    stats: { totalWordsA: 1200, totalWordsB: 1350, addedWords: 150, deletedWords: 20 },
    filters: { ignoreCase: false, ignoreWhitespace: true },
    diffTokens: [
      { value: 'Salary is ', type: 'unchanged' },
      { value: '$100,000', type: 'removed' },
      { value: '$125,000', type: 'added' }
    ],
    decisions: { 'change-1': 'accepted' }
  };

  const saved = await saveComparisonSession(mockComparison, { 'change-1': 'accepted' });
  if (!saved || saved.id !== 'test_session_101') throw new Error('Failed to save session');
  console.log('✓ Session saved successfully:', saved.title);
  console.log('  Similarity:', saved.similarityPercent + '%');
  console.log('  Initial Decisions:', JSON.stringify(saved.decisions));

  // Test 2: Retrieve all sessions
  console.log('\n[Test 2/5] Retrieving all sessions from IndexedDB...');
  const allSessions = await getAllSessions();
  if (allSessions.length !== 1) throw new Error(`Expected 1 session, got ${allSessions.length}`);
  console.log('✓ Successfully retrieved', allSessions.length, 'session(s)');
  console.log('  Title:', allSessions[0].title);
  console.log('  Saved At:', allSessions[0].savedAt);

  // Test 3: Update decisions on existing session
  console.log('\n[Test 3/5] Updating in-line decisions on active session...');
  await updateSessionDecisions('test_session_101', {
    'change-1': 'accepted',
    'change-2': 'rejected'
  });
  const updated = await getSessionById('test_session_101');
  if (updated.decisions['change-2'] !== 'rejected') throw new Error('Decision update failed');
  console.log('✓ Decisions updated successfully in storage:');
  console.log('  Decisions map:', JSON.stringify(updated.decisions));

  // Test 4: Delete session by ID
  console.log('\n[Test 4/5] Deleting a session by ID...');
  const delOk = await deleteSession('test_session_101');
  const afterDelete = await getAllSessions();
  if (!delOk || afterDelete.length !== 0) throw new Error('Delete session failed');
  console.log('✓ Session successfully deleted. Store count:', afterDelete.length);

  // Test 5: Import sessions from JSON backup
  console.log('\n[Test 5/5] Testing JSON Backup Import...');
  const mockBackupJson = JSON.stringify({
    app: 'Ydiff Studio',
    version: '2.0',
    count: 2,
    sessions: [
      {
        id: 'backup_sess_1',
        title: 'Q1_Financials.xlsx vs Q2_Financials.xlsx',
        similarityPercent: 92.4,
        timestamp: new Date().toISOString(),
        meta: { docA: { filename: 'Q1.xlsx' }, docB: { filename: 'Q2.xlsx' } },
        decisions: {}
      },
      {
        id: 'backup_sess_2',
        title: 'Pitch_Deck_v1.pptx vs Pitch_Deck_v2.pptx',
        similarityPercent: 74.0,
        timestamp: new Date().toISOString(),
        meta: { docA: { filename: 'v1.pptx' }, docB: { filename: 'v2.pptx' } },
        decisions: { 'change-1': 'accepted' }
      }
    ]
  });

  const importedCount = await importHistoryFromJson(mockBackupJson);
  const importedList = await getAllSessions();
  if (importedCount !== 2 || importedList.length !== 2) throw new Error('Import failed');
  console.log('✓ Successfully imported', importedCount, 'sessions from JSON backup:');
  importedList.forEach(s => console.log('  - [' + s.similarityPercent + '%] ' + s.title));

  // Clean up
  await clearAllSessions();
  const emptyList = await getAllSessions();
  if (emptyList.length !== 0) throw new Error('Clear all failed');
  console.log('✓ Clear all sessions verified. Store clean.');

  console.log('\n=======================================');
  console.log('🎉 STEP 5 VERIFICATION COMPLETE: INDEXEDDB HISTORY FULLY TESTED & WORKING!');
  console.log('=======================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
