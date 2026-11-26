import assert from 'assert';
import {
  createUser,
  authenticateUser,
  verify2FACode,
  resend2FACode
} from './authService.js';

async function run2FATests() {
  console.log('\n--- Testing Two-Factor Authentication (2FA) Engine ---');

  const testEmail = `user_2fa_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Sarah 2FA Tester';

  // [1/6] Test Account Creation with 2FA Initiation
  console.log('\n[1/6] Testing Account Creation with 2FA Initiation...');
  const signupRes = await createUser({
    name: testName,
    email: testEmail,
    password: testPassword
  });

  assert.strictEqual(signupRes.requires2FA, true, 'Signup must require 2FA');
  assert.ok(signupRes.tempToken, 'Signup must return tempToken');
  assert.strictEqual(signupRes.email, testEmail, 'Email must match');
  assert.ok(signupRes.devCode, 'Dev/simulated code should be returned in test environment');
  console.log(`✓ 2FA Challenge Initiated: tempToken=${signupRes.tempToken.slice(0, 16)}..., code=${signupRes.devCode}`);

  const signupCode = signupRes.devCode;
  const signupToken = signupRes.tempToken;

  // [2/7] Test Non-Numeric Code Rejection (Numbers Only Enforcement)
  console.log('\n[2/7] Testing Non-Numeric 2FA Code Rejection (Numbers Only)...');
  let nonNumericCaught = false;
  try {
    await verify2FACode({ tempToken: signupToken, code: 'abc123' });
  } catch (err) {
    nonNumericCaught = true;
    assert.match(err.message, /6 numbers only/i, 'Error must enforce numbers-only 6-digit code');
    console.log(`✓ Non-numeric code rejected: "${err.message}"`);
  }
  assert.strictEqual(nonNumericCaught, true, 'Non-numeric code must throw error');

  // [3/7] Test Invalid Code Rejection & Attempt Counter
  console.log('\n[3/7] Testing Invalid 2FA Code Rejection & Attempt Counter...');
  let errorCaught = false;
  try {
    await verify2FACode({ tempToken: signupToken, code: '000000' });
  } catch (err) {
    errorCaught = true;
    assert.match(err.message, /4 attempts remaining/i, 'Error message should report 4 attempts remaining');
    console.log(`✓ Invalid code rejected with attempt tracking: "${err.message}"`);
  }
  assert.strictEqual(errorCaught, true, 'Invalid code must throw error');

  // [4/7] Test 2FA Rate-Limiting on Resend
  console.log('\n[4/7] Testing 2FA Resend Rate-Limiting (45s cooldown)...');
  let rateLimitCaught = false;
  try {
    await resend2FACode({ tempToken: signupToken });
  } catch (err) {
    rateLimitCaught = true;
    assert.match(err.message, /Please wait \d+s/i, 'Error message must specify seconds left');
    console.log(`✓ Rate limit correctly enforced: "${err.message}"`);
  }
  assert.strictEqual(rateLimitCaught, true, 'Immediate resend must be rate-limited');

  // [4/6] Test Valid Code Verification on Registration
  console.log('\n[4/6] Testing Valid 2FA Code Verification on Registration...');
  const verifiedSignup = await verify2FACode({ tempToken: signupToken, code: signupCode });
  assert.strictEqual(verifiedSignup.success, true, 'Verification must succeed');
  assert.ok(verifiedSignup.token, 'Must return signed JWT token');
  assert.strictEqual(verifiedSignup.user.email, testEmail, 'User email must match');
  console.log(`✓ Account successfully verified! Issued token: ${verifiedSignup.token.slice(0, 24)}...`);

  // [5/6] Test Login with 2FA Initiation
  console.log('\n[5/6] Testing Login Flow with 2FA Initiation...');
  const loginRes = await authenticateUser({
    email: testEmail,
    password: testPassword
  });

  assert.strictEqual(loginRes.requires2FA, true, 'Login must require 2FA');
  assert.ok(loginRes.tempToken, 'Login must return tempToken');
  assert.ok(loginRes.devCode, 'Login must generate new 6-digit code');
  console.log(`✓ Login 2FA Challenge Initiated: Code=${loginRes.devCode}`);

  // [6/6] Test Valid Code Verification on Login
  console.log('\n[6/6] Testing Valid 2FA Code Verification on Login...');
  const verifiedLogin = await verify2FACode({ tempToken: loginRes.tempToken, code: loginRes.devCode });
  assert.strictEqual(verifiedLogin.success, true, 'Login 2FA verification must succeed');
  assert.ok(verifiedLogin.token, 'Must return full session JWT token');
  assert.strictEqual(verifiedLogin.user.name, testName, 'User name must match');
  console.log(`✓ 2FA Login complete! Logged in as: ${verifiedLogin.user.name} (${verifiedLogin.user.email})`);

  console.log('\n======================================================');
  console.log('🎉 ALL 2FA TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

run2FATests().catch(err => {
  console.error('❌ 2FA Test Failed:', err);
  process.exit(1);
});
