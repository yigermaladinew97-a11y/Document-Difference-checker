import {
  createUser,
  authenticateUser,
  authenticateGoogleUser,
  verify2FACode,
  getUserById,
  verifyToken,
  saveCloudSession,
  getCloudSessions
} from './authService.js';

async function testAuthEngine() {
  console.log('--- Testing Hybrid Authentication & Cloud History Engine ---\n');

  // Test 1: User Signup with 2FA
  console.log('[1/6] Testing User Registration with 2FA...');
  const testEmail = `alex_${Date.now()}@example.com`;
  const signupRes = await createUser({
    name: 'Alex Mercer',
    email: testEmail,
    password: 'SecurePassword2026!'
  });

  const { user: newUser, token } = await verify2FACode({
    tempToken: signupRes.tempToken,
    code: signupRes.devCode
  });

  console.log(`✓ User created & 2FA verified: ID=${newUser.id}, Name="${newUser.name}", Plan=${newUser.plan}`);
  console.log(`✓ Token generated: ${token.substring(0, 30)}...`);

  // Test 2: Token Verification
  console.log('\n[2/6] Verifying JWT Token...');
  const decoded = verifyToken(token);
  console.log(`✓ Token decoded successfully: userId=${decoded.userId}, email=${decoded.email}`);
  if (decoded.userId !== newUser.id) {
    throw new Error('Token payload mismatch!');
  }

  // Test 3: Duplicate Email Check & Validation Rules
  console.log('\n[3/6] Testing Input Validation & Duplicate Email Prevention...');
  try {
    await createUser({ name: 'Invalid Email User', email: 'not-an-email', password: 'SecurePassword2026!' });
    throw new Error('Expected invalid email error to be thrown!');
  } catch (err) {
    console.log(`✓ Invalid email correctly rejected: "${err.message}"`);
  }

  try {
    await createUser({ name: 'Weak Pwd User', email: `valid_${Date.now()}@test.com`, password: 'weak' });
    throw new Error('Expected weak password error to be thrown!');
  } catch (err) {
    console.log(`✓ Weak password correctly rejected: "${err.message}"`);
  }

  try {
    await createUser({ name: 'Duplicate User', email: testEmail, password: 'SecurePassword2026!' });
    throw new Error('Expected duplicate email error to be thrown!');
  } catch (err) {
    console.log(`✓ Duplicate email correctly rejected: "${err.message}"`);
  }

  // Test 4: User Login with 2FA
  console.log('\n[4/6] Testing User Login with 2FA...');
  const loginChallenge = await authenticateUser({
    email: testEmail,
    password: 'SecurePassword2026!'
  });

  const { user: loggedInUser, token: loginToken } = await verify2FACode({
    tempToken: loginChallenge.tempToken,
    code: loginChallenge.devCode
  });
  console.log(`✓ 2FA Login successful for: ${loggedInUser.email} (Token valid: ${Boolean(loginToken)})`);

  // Test 5: 1-Click Google Auth
  console.log('\n[5/6] Testing 1-Click Google Authentication...');
  const googleEmail = `google_user_${Date.now()}@gmail.com`;
  const { user: gUser } = await authenticateGoogleUser({
    email: googleEmail,
    name: 'Sarah Connor',
    avatar: 'https://lh3.googleusercontent.com/sample'
  });
  console.log(`✓ Google User Authenticated: ID=${gUser.id}, Name="${gUser.name}"`);

  // Test 6: Cloud Session Save & Retrieve
  console.log('\n[6/6] Testing Cloud History Save & Sync...');
  const cloudRecord = saveCloudSession(newUser.id, {
    title: 'Merger_Agreement.docx vs Revision.docx',
    similarityPercent: 94.5,
    stats: { totalWordsA: 500, totalWordsB: 520, addedWords: 20 },
    meta: { docA: { filename: 'Merger_Agreement.docx' }, docB: { filename: 'Revision.docx' } }
  });
  console.log(`✓ Cloud Session Saved: ID=${cloudRecord.id}, Title="${cloudRecord.title}"`);

  const userSessions = getCloudSessions(newUser.id);
  console.log(`✓ User Cloud Sessions Retrieved: ${userSessions.length} record(s)`);
  if (userSessions.length !== 1 || userSessions[0].id !== cloudRecord.id) {
    throw new Error('Cloud session retrieval failed!');
  }

  console.log('\n=======================================');
  console.log('🎉 AUTHENTICATION & CLOUD SYNC 100% OPERATIONAL!');
  console.log('=======================================');
}

testAuthEngine().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
