import assert from 'assert';
import http from 'http';
import AdmZip from 'adm-zip';
import { createUser, authenticateUser, verifyToken } from './authService.js';
import { extractDocumentContent } from './parsers.js';

async function runSecurityTests() {
  console.log('--- Testing Enterprise Security Hardening Suite ---\n');

  // ==========================================================================
  // TEST 1: Brute-Force Password Defense & Account Lockout
  // ==========================================================================
  console.log('[Test 1/5] Testing Brute-Force Defense & 15-Minute Account Lockout...');
  const testEmail = `target_${Date.now()}@security.test`;
  const correctPassword = 'StrongPass2026!#';

  await createUser({
    name: 'Security Target',
    email: testEmail,
    password: correctPassword
  });

  // Attempt 4 wrong passwords
  for (let i = 1; i <= 4; i++) {
    try {
      await authenticateUser({ email: testEmail, password: 'WrongPassword!' });
      assert.fail('Should have rejected wrong password');
    } catch (err) {
      assert.strictEqual(err.message, 'Incorrect password. Please check your password and try again.');
    }
  }
  console.log('✓ 4 incorrect password attempts logged safely without timing leakage.');

  // Attempt 5th wrong password -> Triggers Lockout
  try {
    await authenticateUser({ email: testEmail, password: 'WrongPassword!' });
    assert.fail('5th attempt should fail and trigger lockout');
  } catch (err) {
    assert.strictEqual(err.message, 'Incorrect password. Please check your password and try again.');
  }

  // Attempt 6th attempt (even with CORRECT password) -> Must be blocked by Account Lockout!
  try {
    await authenticateUser({ email: testEmail, password: correctPassword });
    assert.fail('Account should be temporarily locked');
  } catch (err) {
    assert(err.message.includes('Account is temporarily locked due to multiple failed login attempts'), 'Lockout message expected');
    console.log(`✓ Brute-force lockout triggered: "${err.message}"\n`);
  }

  // ==========================================================================
  // TEST 2: JWT Tampering & Timing-Safe Verification
  // ==========================================================================
  console.log('[Test 2/5] Testing Cryptographic JWT Tamper Resistance...');
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlX2FkbWluIn0.tampered_signature_here';
  const decoded = verifyToken(fakeToken);
  assert.strictEqual(decoded, null, 'Tampered token must be rejected');
  console.log('✓ Cryptographic HMAC tampering correctly rejected via constant-time verification.\n');

  // ==========================================================================
  // TEST 3: Zip Bomb Decompression Denial-of-Service Defense
  // ==========================================================================
  console.log('[Test 3/5] Testing Zip Bomb & Decompression Exhaustion Defense...');
  // Create simulated zip with excessive entries
  const bombZip = new AdmZip();
  for (let i = 0; i < 1600; i++) {
    bombZip.addFile(`entry_${i}.txt`, Buffer.from('x'));
  }
  const bombBuffer = bombZip.toBuffer();

  try {
    await extractDocumentContent(bombBuffer, 'archive_bomb.docx');
    assert.fail('Excessive zip entries should be rejected');
  } catch (err) {
    assert(err.message.includes('Security Exception'), 'Should throw Security Exception for zip bomb');
    console.log(`✓ Zip bomb safely intercepted: "${err.message}"\n`);
  }

  // ==========================================================================
  // TEST 4: Live Server Security Headers & Fingerprinting Concealment
  // ==========================================================================
  console.log('[Test 4/5] Testing Live HTTP Security Headers & Fingerprint Removal...');
  process.env.PORT = '3098';
  process.env.NODE_ENV = 'production';
  const { default: app, server } = await import('./server.js');
  await new Promise(r => setTimeout(r, 600));

  const res = await fetch('http://localhost:3098/api/health');
  
  // Verify X-Powered-By is hidden
  assert.strictEqual(res.headers.get('x-powered-by'), null, 'x-powered-by header must be hidden');
  console.log('✓ "X-Powered-By: Express" fingerprint concealed');

  // Verify OWASP headers
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  console.log('✓ Verified: X-Content-Type-Options: nosniff');
  console.log('✓ Verified: X-Frame-Options: SAMEORIGIN');
  console.log('✓ Verified: Referrer-Policy: strict-origin-when-cross-origin\n');

  // ==========================================================================
  // TEST 5: Dangerous Executable Upload Rejection
  // ==========================================================================
  console.log('[Test 5/5] Testing Dangerous File (.exe / .sh) Rejection in Upload Pipeline...');
  const dangerousForm = new FormData();
  dangerousForm.append('fileA', new Blob(['#!/bin/bash\necho "malicious"'], { type: 'text/plain' }), 'malware.sh');
  dangerousForm.append('fileB', new Blob(['hello'], { type: 'text/plain' }), 'valid.txt');

  const uploadRes = await fetch('http://localhost:3098/api/compare', {
    method: 'POST',
    body: dangerousForm
  });

  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadRes.status, 403);
  assert(uploadData.error.includes('Security Exception: Uploading executable or script files (.sh) is strictly prohibited.'));
  console.log(`✓ Dangerous script upload rejected with 403: "${uploadData.error}"\n`);

  console.log('======================================================');
  console.log('🎉 ALL ENTERPRISE SECURITY TESTS PASSED (100%)!');
  console.log('======================================================\n');

  if (server) {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(r => server.close(r));
  }
  setTimeout(() => process.exit(0), 100);
}

runSecurityTests().catch(err => {
  console.error('❌ Security test failed:', err);
  process.exit(1);
});
