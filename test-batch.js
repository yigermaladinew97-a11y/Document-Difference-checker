import assert from 'assert';
import { autoPairFiles } from './client/src/utils/pairingEngine.js';

console.log('Testing pairingEngine...');

const mockFiles = [
  { name: 'Contract_v1.pdf', lastModified: 1000 },
  { name: 'Contract_v2.pdf', lastModified: 2000 },
  { name: 'Financial_Ledger_2023.xlsx', lastModified: 1000 },
  { name: 'Financial_Ledger_2024.xlsx', lastModified: 2000 },
  { name: 'API_Spec_draft.docx', lastModified: 1000 },
  { name: 'API_Spec_final.docx', lastModified: 2000 },
  { name: 'Unmatched_Notes.txt', lastModified: 3000 }
];

const { pairs, unpaired } = autoPairFiles(mockFiles);

console.log(`Detected ${pairs.length} pairs, ${unpaired.length} unpaired:`);
pairs.forEach((p, idx) => {
  console.log(`  [Pair ${idx + 1}] ${p.docA.name} <---> ${p.docB.name} (${p.matchReason})`);
});
console.log('Unpaired files:');
unpaired.forEach(f => console.log(`  - ${f.name}`));

assert.strictEqual(pairs.length, 3, 'Expected 3 pairs to be auto-detected');
assert.strictEqual(unpaired.length, 1, 'Expected 1 unpaired file');
assert.strictEqual(pairs[0].docA.name, 'Contract_v1.pdf');
assert.strictEqual(pairs[0].docB.name, 'Contract_v2.pdf');

console.log('✅ pairingEngine tests passed successfully!');
