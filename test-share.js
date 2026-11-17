import assert from 'assert';
import { createShareReport, getShareReport } from './shareService.js';

console.log('Testing shareService...');

const sampleData = {
  metrics: { lexicalSimilarityPercent: 88, isIdentical: false },
  stats: { wordsAdded: 5, wordsDeleted: 3, totalDifferences: 8 },
  meta: {
    docA: { filename: 'NDA_2023.pdf', format: '.pdf' },
    docB: { filename: 'NDA_2024.pdf', format: '.pdf' }
  }
};

const result = createShareReport(sampleData, { title: 'Legal NDA Review' });
console.log('Created share:', result);

assert.ok(result.shareId, 'Must have a shareId');
assert.ok(result.expiresAt, 'Must have an expiresAt timestamp');

const fetched = getShareReport(result.shareId);
assert.ok(fetched, 'Fetched record must exist');
assert.strictEqual(fetched.shareId, result.shareId);
assert.strictEqual(fetched.comparisonData.metrics.lexicalSimilarityPercent, 88);
assert.strictEqual(fetched.comparisonData.meta.docA.filename, 'NDA_2023.pdf');

console.log('✅ shareService tests passed successfully!');
