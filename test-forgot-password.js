import assert from 'assert';
import {
  createUser,
  authenticateUser,
  verify2FACode,
  requestPasswordReset,
  resetPasswordWithCode,
  resendPasswordResetCode
} from './authService.js';

async function runForgotPasswordTests() {
  console.log('\n--- Testing "Forgot Password" with Email OTP Engine ---');

  const testEmail = `recovery_${Date.now()}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'BrandNewSecurePassword2026#';
  const userName = 'Password Reset Tester';

  // [1/8] Setup: Create User Account
  console.log('\n[1/8] Registering test user...');
  const signupRes = await createUser({
    name: userName,
    email: testEmail,
    password: initialPassword
  });
  await verify2FACode({ tempToken: signupRes.tempToken, code: signupRes.devCode });
  console.log(`✓ Test user registered: ${testEmail}`);

  // [2/8] Request Reset for Non-Existent Email
  console.log('\n[2/8] Testing Non-Existent Email rejection...');
  let errorCaught = false;
  try {
    await requestPasswordReset({ email: 'ghost_non_existent@example.com' });
  } catch (err) {
    errorCaught = true;
    assert.match(err.message, /No account found/i);
    console.log(`✓ Non-existent email correctly rejected: "${err.message}"`);
  }
  assert.strictEqual(errorCaught, true);

  // [3/8] Request Reset for Registered Email
  console.log('\n[3/8] Requesting Password Reset Code...');
  const resetChallenge = await requestPasswordReset({ email: testEmail });
  assert.strictEqual(resetChallenge.success, true);
  assert.ok(resetChallenge.tempToken);
  assert.ok(resetChallenge.devCode);
  console.log(`✓ 6-digit reset code issued: ${resetChallenge.devCode}`);

  const tempToken = resetChallenge.tempToken;
  const correctCode = resetChallenge.devCode;

  // [4/8] Test Resend Rate Limiting (45s cooldown)
  console.log('\n[4/8] Testing Resend 45s Cooldown...');
  let resendBlocked = false;
  try {
    await resendPasswordResetCode({ tempToken });
  } catch (err) {
    resendBlocked = true;
    assert.match(err.message, /Please wait \d+s/i);
    console.log(`✓ Resend rate limit enforced: "${err.message}"`);
  }
  assert.strictEqual(resendBlocked, true);

  // [5/8] Test Invalid Code Rejection
  console.log('\n[5/8] Testing Invalid Reset Code Rejection...');
  let invalidCodeCaught = false;
  try {
    await resetPasswordWithCode({
      tempToken,
      code: '999999',
      newPassword: updatedPassword
    });
  } catch (err) {
    invalidCodeCaught = true;
    assert.match(err.message, /Invalid reset code/i);
    console.log(`✓ Invalid code rejected with attempt tracking: "${err.message}"`);
  }
  assert.strictEqual(invalidCodeCaught, true);

  // [6/8] Test Weak Password Rejection
  console.log('\n[6/8] Testing Weak Password Rejection on Reset...');
  let weakPasswordCaught = false;
  try {
    await resetPasswordWithCode({
      tempToken,
      code: correctCode,
      newPassword: 'weak'
    });
  } catch (err) {
    weakPasswordCaught = true;
    assert.match(err.message, /at least 8 characters/i);
    console.log(`✓ Weak password rejected: "${err.message}"`);
  }
  assert.strictEqual(weakPasswordCaught, true);

  // [7/8] Test Successful Password Reset
  console.log('\n[7/8] Submitting Valid Code and Strong New Password...');
  const resetSuccess = await resetPasswordWithCode({
    tempToken,
    code: correctCode,
    newPassword: updatedPassword
  });
  assert.strictEqual(resetSuccess.success, true);
  assert.ok(resetSuccess.token);
  assert.strictEqual(resetSuccess.user.email, testEmail);
  console.log(`✓ Password reset succeeded! Auto-issued JWT token: ${resetSuccess.token.slice(0, 20)}...`);

  // [8/8] Verify Old Password is DEAD and New Password WORKS
  console.log('\n[8/8] Verifying Old Password fails and New Password works...');
  let oldPasswordBlocked = false;
  try {
    await authenticateUser({ email: testEmail, password: initialPassword });
  } catch (err) {
    oldPasswordBlocked = true;
    assert.match(err.message, /Incorrect password/i);
    console.log(`✓ Old password was rejected: "${err.message}"`);
  }
  assert.strictEqual(oldPasswordBlocked, true);

  const newLogin = await authenticateUser({ email: testEmail, password: updatedPassword });
  assert.strictEqual(newLogin.requires2FA, true);
  console.log(`✓ Login with NEW password succeeded (triggered 2FA with Code=${newLogin.devCode})!`);

  console.log('\n======================================================');
  console.log('🎉 FORGOT PASSWORD FLOW 100% OPERATIONAL!');
  console.log('======================================================\n');
}

runForgotPasswordTests().catch((err) => {
  console.error('❌ Forgot Password Test Failed:', err);
  process.exit(1);
});
