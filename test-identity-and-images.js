import assert from 'assert';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { compareDocuments, detectEntitySwaps, compareDocumentImages } from './comparator.js';
import { extractDocumentContent } from './parsers.js';
import { analyzeDocumentContext } from './ai_summarizer.js';

console.log('--- Testing Entity / Identity Swap & Image Diff Engine ---\n');

// ============================================================================
// TEST 1: High-Similarity Document with Identity / Person Name Swap
// ============================================================================
console.log('[Test 1/3] Testing Entity Swap Sentinel on 95%+ Similar Contracts...');

const textA = `MASTER CONSULTING SERVICES AGREEMENT
This Consulting Agreement is entered into by and between Alice Walker ("Consultant") and Acme Corporation ("Client").
1. Scope of Work: Alice Walker agrees to perform architecture consulting and technical services.
2. Invoicing: Alice Walker shall submit itemized monthly invoices to Client.
3. Ownership: All work product created by Alice Walker shall belong exclusively to Client.`;

const textB = `MASTER CONSULTING SERVICES AGREEMENT
This Consulting Agreement is entered into by and between Bob Jenkins ("Consultant") and Acme Corporation ("Client").
1. Scope of Work: Bob Jenkins agrees to perform architecture consulting and technical services.
2. Invoicing: Bob Jenkins shall submit itemized monthly invoices to Client.
3. Ownership: All work product created by Bob Jenkins shall belong exclusively to Client.`;

const docA = { filename: 'MSA_Alice_Walker.docx', format: 'docx', text: textA, sections: [{ title: 'Main', content: textA }] };
const docB = { filename: 'MSA_Bob_Jenkins.docx', format: 'docx', text: textB, sections: [{ title: 'Main', content: textB }] };

const comparison = compareDocuments(docA, docB);

console.log(`✓ Textual Similarity: ${comparison.similarityPercent}%`);
assert(comparison.similarityPercent >= 80, 'Similarity should be high (> 80%)');
assert(comparison.entitySwaps && comparison.entitySwaps.length > 0, 'Should detect entity swaps');

const primarySwap = comparison.entitySwaps[0];
console.log(`✓ Detected Entity Swap: "${primarySwap.entityA}" ➔ "${primarySwap.entityB}" (${primarySwap.count}x)`);
assert.strictEqual(primarySwap.entityA, 'Alice Walker');
assert.strictEqual(primarySwap.entityB, 'Bob Jenkins');
assert.strictEqual(primarySwap.severity, 'CRITICAL');

// Test that Risk Radar elevates risk to CRITICAL / HIGH due to identity swap
const contextAnalysis = await analyzeDocumentContext({
  textA,
  textB,
  stats: comparison.stats,
  sectionReports: comparison.sectionReports,
  summary: comparison.summary,
  entitySwaps: comparison.entitySwaps
});

console.log(`✓ Risk Radar Level: ${contextAnalysis.riskRadar.overallRiskLevel} (Score: ${contextAnalysis.riskRadar.riskScore}/100)`);
assert(contextAnalysis.riskRadar.riskScore >= 60, 'Score should be elevated due to identity swap');
const identityFlag = contextAnalysis.riskRadar.riskFlags.find(f => f.category === 'IDENTITY_SWAP');
assert(identityFlag, 'Risk flags must contain IDENTITY_SWAP');
console.log(`✓ Risk Flag Generated: [${identityFlag.severity}] ${identityFlag.title}`);
console.log(`   Impact: ${identityFlag.impact}\n`);

// ============================================================================
// TEST 2: Embedded Image Extraction & Photo Replacement Detection
// ============================================================================
console.log('[Test 2/3] Testing Embedded Image / Photo Mismatch Engine...');

// Create two simulated DOCX zip archives with different photos
const photo1Buffer = Buffer.from('FAKE_IMAGE_DATA_PERSON_A_PORTRAIT_12345');
const photo2Buffer = Buffer.from('FAKE_IMAGE_DATA_PERSON_B_PORTRAIT_67890');

const zipA = new AdmZip();
const validDocxXml = (name) => `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Resume: ${name}</w:t></w:r></w:p></w:body></w:document>`;
zipA.addFile('word/document.xml', Buffer.from(validDocxXml('Alice')));
zipA.addFile('word/media/profile_photo.png', photo1Buffer);

const zipB = new AdmZip();
zipB.addFile('word/document.xml', Buffer.from(validDocxXml('Bob')));
zipB.addFile('word/media/profile_photo.png', photo2Buffer);

const parsedA = await extractDocumentContent(zipA.toBuffer(), 'Resume_Alice.docx');
const parsedB = await extractDocumentContent(zipB.toBuffer(), 'Resume_Bob.docx');

console.log(`✓ Doc A Extracted Images: ${parsedA.images.length} (Name: ${parsedA.images[0]?.name}, Size: ${parsedA.images[0]?.size} bytes)`);
console.log(`✓ Doc B Extracted Images: ${parsedB.images.length} (Name: ${parsedB.images[0]?.name}, Size: ${parsedB.images[0]?.size} bytes)`);

assert.strictEqual(parsedA.images.length, 1);
assert.strictEqual(parsedB.images.length, 1);
assert.notStrictEqual(parsedA.images[0].hash, parsedB.images[0].hash, 'Hashes should differ for different photos');

const docComparisonWithImages = compareDocuments(parsedA, parsedB);
console.log(`✓ Image Comparison Status: ${docComparisonWithImages.imageDiff.status}`);
assert.strictEqual(docComparisonWithImages.imageDiff.status, 'REPLACED');
assert.strictEqual(docComparisonWithImages.imageDiff.mismatchesCount, 1);

const imgMismatch = docComparisonWithImages.imageDiff.mismatches[0];
console.log(`✓ Mismatch Flag: [${imgMismatch.type}] ${imgMismatch.title}`);
console.log(`   Detail: ${imgMismatch.description}\n`);

// ============================================================================
// TEST 3: Direct Visual Image Upload Comparison (.png / .jpg)
// ============================================================================
console.log('[Test 3/3] Testing Direct Profile Image Upload Comparison (.png / .jpg)...');

const imgDirectA = await extractDocumentContent(photo1Buffer, 'Alice_ID_Photo.png');
const imgDirectB = await extractDocumentContent(photo2Buffer, 'Bob_ID_Photo.png');

console.log(`✓ Image Extracted: format=${imgDirectA.format}, imagesCount=${imgDirectA.images.length}`);
assert.strictEqual(imgDirectA.format, 'image');
assert.strictEqual(imgDirectA.images.length, 1);

const directImgDiff = compareDocuments(imgDirectA, imgDirectB);
assert.strictEqual(directImgDiff.imageDiff.status, 'REPLACED');
console.log(`✓ Direct Image Comparison Succeeded: status=${directImgDiff.imageDiff.status}\n`);

console.log('======================================================');
console.log('🎉 ALL IDENTITY SWAP & IMAGE DIFF TESTS PASSED (100%)!');
console.log('======================================================\n');
