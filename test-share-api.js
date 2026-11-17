import assert from 'assert';

async function runTest() {
  console.log('Testing Share API endpoints...');

  const sampleComparison = {
    metrics: {
      lexicalSimilarityPercent: 85,
      contextSimilarityPercent: 90,
      isIdentical: false,
      analysisMode: 'local'
    },
    stats: {
      wordsAdded: 12,
      wordsDeleted: 8,
      wordsUnchanged: 120,
      totalDifferences: 20
    },
    meta: {
      docA: { filename: 'Master_Agreement_v1.pdf', format: '.pdf', wordCount: 128 },
      docB: { filename: 'Master_Agreement_v2.pdf', format: '.pdf', wordCount: 132 }
    },
    summary: {
      verdictHeadline: 'High alignment with targeted commercial changes'
    },
    diffTokens: [
      { type: 'unchanged', value: 'This is an agreement ' },
      { type: 'removed', value: 'old term ' },
      { type: 'added', value: 'new revised term ' }
    ]
  };

  const port = process.env.PORT || 3000;
  
  // 1. Create Share
  const createRes = await fetch(`http://localhost:${port}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comparisonData: sampleComparison,
      title: 'Agreement Review v1 vs v2'
    })
  });

  const createData = await createRes.json();
  console.log('Create share response:', createData);
  assert.strictEqual(createRes.status, 200);
  assert.strictEqual(createData.success, true);
  assert.ok(createData.shareId, 'Must return shareId');
  assert.ok(createData.shareUrl, 'Must return shareUrl');

  // 2. Fetch Shared Report
  const getRes = await fetch(`http://localhost:${port}/api/share/${createData.shareId}`);
  const getData = await getRes.json();
  console.log('Get share response:', {
    success: getData.success,
    shareId: getData.share?.shareId,
    title: getData.share?.title,
    metrics: getData.share?.comparisonData?.metrics
  });

  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getData.success, true);
  assert.strictEqual(getData.share.shareId, createData.shareId);
  assert.strictEqual(getData.share.comparisonData.metrics.lexicalSimilarityPercent, 85);
  assert.strictEqual(getData.share.comparisonData.meta.docA.filename, 'Master_Agreement_v1.pdf');

  // 3. Test non-existent share
  const notFoundRes = await fetch(`http://localhost:${port}/api/share/nonexistent999`);
  assert.strictEqual(notFoundRes.status, 404);

  console.log('✅ Share API end-to-end integration test passed successfully!');
}

runTest().catch(err => {
  console.error('❌ Share API test failed:', err);
  process.exit(1);
});
