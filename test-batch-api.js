import assert from 'assert';
import { server } from './server.js';

async function runTest() {
  console.log('Testing /api/batch-compare endpoint...');

  const form = new FormData();

  const file1A = new Blob(['# Service Agreement v1\nProvider will deliver web consulting services for $10,000.'], { type: 'text/plain' });
  const file1B = new Blob(['# Service Agreement v2\nProvider will deliver web and mobile consulting services for $15,000.'], { type: 'text/plain' });
  
  const file2A = new Blob(['Product,Price\nWidget,$20\nGadget,$50'], { type: 'text/csv' });
  const file2B = new Blob(['Product,Price\nWidget,$25\nGadget,$50\nGizmo,$99'], { type: 'text/csv' });

  form.append('files', file1A, 'Agreement_v1.txt');
  form.append('files', file1B, 'Agreement_v2.txt');
  form.append('files', file2A, 'Pricing_old.csv');
  form.append('files', file2B, 'Pricing_new.csv');

  const pairsMapping = [
    { id: 'pair_1', aName: 'Agreement_v1.txt', bName: 'Agreement_v2.txt' },
    { id: 'pair_2', aName: 'Pricing_old.csv', bName: 'Pricing_new.csv' }
  ];

  form.append('pairs', JSON.stringify(pairsMapping));
  form.append('ignoreWhitespace', 'true');

  const port = process.env.PORT || 3099;
  const res = await fetch(`http://localhost:${port}/api/batch-compare`, {
    method: 'POST',
    body: form
  });

  const data = await res.json();
  console.log('Response status:', res.status);
  console.log('Batch response:', {
    success: data.success,
    totalPairs: data.batchMetrics?.totalPairs,
    averageSimilarity: data.batchMetrics?.averageSimilarityPercent,
    resultsCount: data.results?.length
  });

  assert.strictEqual(data.success, true, 'Batch comparison must succeed');
  assert.strictEqual(data.results.length, 2, 'Must have 2 pair results');
  assert.strictEqual(data.batchMetrics.totalPairs, 2, 'Batch metrics total pairs must be 2');
  assert.ok(data.results[0].metrics.lexicalSimilarityPercent > 0, 'Pair 1 similarity must be > 0');
  assert.ok(data.results[1].metrics.lexicalSimilarityPercent > 0, 'Pair 2 similarity must be > 0');

  console.log('✅ /api/batch-compare end-to-end integration test passed!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ Batch API test failed:', err);
  process.exit(1);
});
